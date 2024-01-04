import type { Plugin } from "vite";
import { getLibraryConfigFilePath, getTransformConfig } from "./config/config";
import { getFileInformation } from "./fileInformation";
import { dedent } from "ts-dedent";
import { libraryName, shortLibraryName } from "./library.config";
import { transformCode } from "./transforms";
import { newEmittedFiles } from "./transforms/inject";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

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

export const plugin = () => {
    const emitted = newEmittedFiles();
    const hiddenDirectoryPath = path.resolve(
        process.cwd(),
        `.${shortLibraryName}`
    );
    return {
        name: `vite-plugin-${libraryName}`,
        // makes sure we run before vite-plugin-svelte
        enforce: "pre" as const,
        async buildStart() {
            // Make sure that the hidden library directory exists.
            await mkdir(hiddenDirectoryPath, { recursive: true });
            // Add a gitignore file in the directory
            await writeFile(
                path.resolve(hiddenDirectoryPath, ".gitignore"),
                "*"
            );
        },
        resolveId(id) {
            if ([...emitted.values()].some(e => e.fileReference === id))
                return "\0" + id;
            return;
        },
        async load(id) {
            const configFilePath = await getLibraryConfigFilePath();
            this.addWatchFile(configFilePath);
            const config = await getTransformConfig();
            // Load the virtual imports (Our style definitions)
            const found = [...emitted.entries()].find(([, v]) =>
                id.includes(v.fileReference)
            );

            const { styles: resolved, fileReference } = found?.[1] ?? {};
            if (!fileReference) return;
            const fileInformation = getFileInformation(config, fileReference);
            if (!fileInformation) return;

            if (config.debug && resolved) {
                printDebug(fileReference, fileInformation.type, {
                    id: id,
                    resolved: resolved,
                    type: "load",
                });
            }
            // Also print content of virtual file into hidden library directory
            if (found?.[0] && resolved) {
                await writeFile(
                    path.resolve(hiddenDirectoryPath, `./${found?.[0]}.js`),
                    resolved
                );
            }
            return resolved;
        },
        async transform(code, id) {
            const config = await getTransformConfig();

            const fileInformation = getFileInformation(config, id);
            if (!fileInformation) return null;

            // Skip transforms on registrations and on the library configuration file
            if (
                fileInformation.type === "registration" ||
                fileInformation.type === "configuration"
            ) {
                // Call this.reload to reload virtual module
                emitted.forEach(e =>
                    this.resolve(e.fileReference, undefined, {
                        skipSelf: false,
                    })
                );
                return undefined;
            }

            const transformedCode = await transformCode(
                config,
                code,
                fileInformation,
                emitted
            );
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
    } satisfies Plugin;
};
