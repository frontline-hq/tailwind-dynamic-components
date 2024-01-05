import path from "path";
import { type TransformConfig } from "./config/config";

import { shortLibraryName } from "./library.config";

export type FileType =
    | "*.js"
    | "*.svelte"
    | "virtual"
    | "registration"
    | "configuration";

export type FileInformation = {
    type: FileType;
};

const scriptExtensions = [".js", ".ts"];

export const getFileInformation = (
    config: TransformConfig,
    rawId: string
): FileInformation | undefined => {
    if (rawId.startsWith("virtual:")) return { type: "virtual" };
    const id = path.normalize(rawId);

    if (
        !id.startsWith(config.cwdFolderPath) ||
        id.startsWith(path.resolve(config.cwdFolderPath, "node_modules")) ||
        id.startsWith(path.resolve(config.cwdFolderPath, ".svelte-kit"))
    )
        return undefined;

    const { ext, name } = path.parse(id);

    if (scriptExtensions.includes(ext)) {
        if (name.endsWith(`${shortLibraryName}`))
            return { type: "registration" };
        if ("vite.config.ts".includes(name))
            return {
                type: "configuration",
            };
        return {
            type: "*.js",
        };
    }

    if (ext === ".svelte") {
        return {
            type: "*.svelte",
        };
    }

    return undefined;
};
