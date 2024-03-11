import type { Plugin } from "vite";
import { configFileName, getTransformConfig } from "./config/config";
import { getFileInformation } from "./fileInformation";
import { dedent } from "ts-dedent";
import { libraryName, shortLibraryName } from "./library.config";
import { transformCode } from "./transforms";
import { getGlobalWatcherSubscription } from "./utils";
import { writeFile } from "node:fs/promises";
import { WriteStream, createWriteStream } from "node:fs";
import path from "path";

function printDebug(
    filePath: string,
    fileType: string,
    data:
        | { code: string; transformed: string; type: "transform" }
        | { id: string; resolved: string; type: "load" },
    debugPrinter: (log: string) => void = console.info
) {
    debugPrinter(dedent`
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
    let logStream: WriteStream;
    return {
        name: `vite-plugin-${shortLibraryName}`,
        // makes sure we run before vite-plugin-svelte
        enforce: "pre",
        config: () => ({
            server: { fs: { allow: [`./${configFileName}`] } },
        }),
        // Restart vite server when the library config changes ✅
        // Check: does that also inlude dependencies of config file? ❌
        // (credit to https://github.com/antfu/vite-plugin-restart)
        async configureServer(server) {
            server.watcher.add([`./${configFileName}`, "src/**/*.tdc.ts"]);
            server.watcher.on("add", handleFileChange);
            server.watcher.on("change", handleFileChange);
            server.watcher.on("unlink", unlinkFile);
            const debugLogPath = path.resolve(
                config.cwdFolderPath,
                ".debug.tdc.txt"
            );

            if (logStream) logStream.end();
            if (config.debug)
                await writeFile(debugLogPath, "", {
                    encoding: "utf8",
                    flag: "w",
                });
            logStream = createWriteStream(debugLogPath, { flags: "a" });
            //writeFile(,content,{encoding:'utf8',flag:'w'})
            async function handleFileChange(path: string) {
                if (config.debug)
                    console.log(
                        `Config file ${configFileName} changed. Restarting server...`
                    );
                if (path.includes(configFileName) || path.endsWith(".tdc.ts")) {
                    await server.restart();
                }
            }

            async function unlinkFile() {
                await server.restart();
            }
        },
        async buildEnd() {
            if (logStream) logStream.end();
            console.log("Closing filesystem watcher...");
            const w = getGlobalWatcherSubscription();
            if (w) await w.unsubscribe();
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
            if (config.debug && transformedCode) {
                printDebug(
                    id.replace(config.cwdFolderPath, ""),
                    fileInformation.type,
                    {
                        code,
                        transformed: transformedCode.code,
                        type: "transform",
                    },
                    (log: string) => logStream.write(log + "\n")
                );
            }
            return transformedCode;
        },
    };
}
