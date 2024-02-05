import type { Plugin } from "vite";
import {
    configFileName,
    getLibraryConfig,
    getTransformConfig,
} from "./config/config";
import { getFileInformation } from "./fileInformation";
import { dedent } from "ts-dedent";
import { libraryName, shortLibraryName } from "./library.config";
import { transformCode } from "./transforms";
import difference from "lodash.difference";
import {
    getGlobalSafelist,
    reloadTailwind,
    setGlobalSafelist,
} from "./safelisting/safelisting";

function printDebug(
    filePath: string,
    fileType: string,
    data:
        | { code: string; transformed: string; type: "transform" }
        | { id: string; resolved: string; type: "load" }
) {
    console.info(dedent`
        -- DEBUG START-----------------------------------------------------------

        ${data.type}ed '${fileType}' file: '${filePath}'

        -- INPUT -----------------------------------------------------------------------

        ${data.type === "transform" ? data.code : data.id}

        -- OUTPUT ----------------------------------------------------------------------

        ${data.type === "transform" ? data.transformed : data.resolved}

        -- ${libraryName.toUpperCase()} DEBUG END ------------------------------------------------------------
    `);
}

export async function plugin(): Promise<Plugin> {
    const config = await getTransformConfig();
    return {
        name: `vite-plugin-${shortLibraryName}`,
        // makes sure we run before vite-plugin-svelte
        enforce: "pre",
        // Restart vite server when the library config changes ✅
        // Check: does that also inlude dependencies of config file? ❌
        // (credit to https://github.com/antfu/vite-plugin-restart)
        async configureServer(server) {
            server.watcher.add([`./${configFileName}`, "src/**/*.tdc.ts"]);
            server.watcher.on("add", handleFileChange);
            server.watcher.on("change", handleFileChange);
            server.watcher.on("unlink", unlinkFile);

            async function handleFileChange(path: string, stats: unknown) {
                if (config.debug)
                    console.log(
                        `Config file ${configFileName} changed. Restarting server...`
                    );
                if (path.includes(configFileName) || path.endsWith(".tdc.ts")) {
                    await server.restart();
                    //await reloadTailwind(getLibraryConfig().tailwindConfigPath);
                }
            }

            async function unlinkFile(path: string) {
                await server.restart();
                /* if (path.includes(configFileName))
                    await reloadTailwind(getLibraryConfig().tailwindConfigPath); */
            }
        },
        async transform(code, id) {
            const fileInformation = getFileInformation(config, id);
            if (!fileInformation) return null;

            // Skip transforms on registrations and on the library configuration file
            if (
                fileInformation.type === "registration" ||
                fileInformation.type === "configuration"
            )
                return undefined;

            const transformedCode = await transformCode(
                config,
                code,
                fileInformation
            );
            if (
                transformedCode &&
                difference(transformedCode.safelist, getGlobalSafelist() ?? [])
                    .length > 0
            ) {
                setGlobalSafelist(transformedCode.safelist);
                if (config.debug)
                    console.log(`Safelist has changed. Restarting tailwind...`);
                await reloadTailwind(getLibraryConfig().tailwindConfigPath);
            }
            if (config.debug && transformedCode) {
                printDebug(
                    id.replace(config.cwdFolderPath, ""),
                    fileInformation.type,
                    {
                        code,
                        transformed: transformedCode.code,
                        type: "transform",
                    }
                );
            }
            return transformedCode;
        },
    };
}
