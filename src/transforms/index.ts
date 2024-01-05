import type { TransformConfig } from "../config/config.js";
import type { FileInformation } from "../fileInformation.js";
import { libraryName } from "../library.config.js";
import { transformJs } from "./_.js.js";
import { transformSvelte } from "./_.svelte.js";
import { newEmittedFiles } from "./inject.js";

// TODO: throw errors if something is not supported and show a guide how to add the functionality manually

export const transformCode = async (
    config: TransformConfig,
    code: string,
    { type }: FileInformation,
    emitted: ReturnType<typeof newEmittedFiles>
) => {
    if (!pluginOrderVerified && type.endsWith(".svelte"))
        assertCorrectPluginOrder(code);

    switch (type) {
        case "*.js":
            return await transformJs(config, code, emitted);
        case "*.svelte":
            return await transformSvelte(config, code, emitted);
    }
    return;

    // 1. Process emitted (first Styles and children of compoundStyles, then CompoundStyles). For CompoundStyles process the substyles
    // 2.
};

// ------------------------------------------------------------------------------------------------

let pluginOrderVerified = false;

const REGEX_SVELTE_COMPILER_INFO =
    /^\/\*\s.*\.svelte generated by Svelte v\d+.\d+.\d+\s\*\/$/;

const assertCorrectPluginOrder = (code: string) => {
    if (code.split("\n")[0]?.match(REGEX_SVELTE_COMPILER_INFO)) {
        throw new Error(
            `Make sure to place the ${libraryName} plugin before the svelte plugin in your vite config.`
        );
    }

    pluginOrderVerified = true;
};
