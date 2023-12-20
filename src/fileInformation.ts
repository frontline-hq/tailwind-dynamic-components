import path, { normalize } from "node:path";
import type { TransformConfig } from "./config";

export type FileType = "*.js" | "*.svelte";

export type FileInformation = {
    type: FileType;
};

const scriptExtensions = [".js", ".ts"];

export const getFileInformation = (
    config: TransformConfig,
    rawId: string
): FileInformation | undefined => {
    const id = normalize(rawId);

    if (
        !id.startsWith(config.cwdFolderPath) ||
        id.startsWith(path.resolve(config.cwdFolderPath, "node_modules")) ||
        id.startsWith(path.resolve(config.cwdFolderPath, ".svelte-kit"))
    )
        return undefined;

    const { ext } = path.parse(id);

    if (scriptExtensions.includes(ext)) {
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
