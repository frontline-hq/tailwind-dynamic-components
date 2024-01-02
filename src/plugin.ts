import type { Plugin } from "vite";
import { getTransformConfig } from "./config/config";
import { getFileInformation } from "./fileInformation";
import { dedent } from "ts-dedent";
import { libraryName } from "./library.config";
import { transformCode } from "./transforms";
import { newEmittedFiles } from "./transforms/inject";

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
    return {
        name: `vite-plugin-${libraryName}`,
        // makes sure we run before vite-plugin-svelte
        enforce: "pre" as const,
        resolveId(id) {
            if ([...emitted.values()].some(e => e.fileReference === id))
                return "\0" + id;
            return;
        },
        async load(id) {
            const config = await getTransformConfig();
            // Load the virtual imports (Our style definitions)
            const found = [...emitted.values()].find(e =>
                id.includes(e.fileReference)
            );

            const { styles: resolved, fileReference } = found ?? {};
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
            )
                return undefined;

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