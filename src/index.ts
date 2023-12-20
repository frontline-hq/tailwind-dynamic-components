import type { Plugin } from "rollup";
import { getTransformConfig } from "./config";
import { getFileInformation } from "./fileInformation";
import { dedent } from "ts-dedent";
import { libraryName } from "./library.config";
import { transformCode } from "./transforms";
import { newEmittedFiles } from "./transforms/inject";

export const plugin = () => {
    const emitted = newEmittedFiles();
    return {
        name: `vite-plugin-${libraryName}`,
        // makes sure we run before vite-plugin-svelte
        enforce: "pre",
        async transform(code, id) {
            const config = await getTransformConfig();

            const fileInformation = getFileInformation(config, id);
            if (!fileInformation) return null;

            const transformedCode = await transformCode(
                config,
                code,
                fileInformation,
                this,
                emitted
            );
            if (config.debug) {
                const filePath = id.replace(config.cwdFolderPath, "");
                console.info(dedent`
                -- DEBUG START-----------------------------------------------------------

                transformed '${fileInformation.type}' file: '${filePath}'

                -- INPUT -----------------------------------------------------------------------

                ${code}

                -- OUTPUT ----------------------------------------------------------------------

                ${transformedCode}

                -- ${libraryName.toUpperCase()} DEBUG END ------------------------------------------------------------
            `);
            }

            return transformedCode;
        },
    } satisfies Plugin;
};
