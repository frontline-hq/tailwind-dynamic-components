import path from "path";
import { stat /* readFile */ } from "fs/promises";
import { pathToFileURL } from "url";
/* import { VERSION } from "@sveltejs/kit"; */
import type { Config as SvelteConfig } from "@sveltejs/kit";
import { shortLibraryName } from "../library.config";
import type { Registration } from "../register";
import j from "jiti";

export const configFileName = `${shortLibraryName}.config.ts` as const;

export function getConfigFilePath() {
    return path.resolve(process.cwd(), `./${shortLibraryName}.config.ts`);
}

export async function findConfigFileFolder(directory: string = process.cwd()) {
    if (
        (await doesPathExist(path.join(directory, configFileName))) ||
        directory === process.cwd()
    )
        return directory;
    const parentDirectory = path.join(directory, "..");
    return findConfigFileFolder(parentDirectory);
}

export const doesPathExist = async (path: string) =>
    !!(await stat(path).catch(() => false));

/* type VersionString = `${number}.${number}.${number}`; */

export type LibraryConfig = {
    debug: boolean;
    registrations: Array<Registration>;
    tagNameDelimiter: string;
    tailwindConfigPath: string;
};

export type TransformConfig = {
    cwdFolderPath: string;
    debug?: boolean;
    usesTypeScript: boolean;
    library: LibraryConfig;
    svelteKit?: {
        version: string;
        rootRoutesFolder: string;
        files: {
            appTemplate: string;
            routes: string;
            serverHooks: string;
        };
    };
};

export function checkRegistrations(registrations: Array<Registration>) {
    registrations.forEach(
        r =>
            Object.values(r.dependencies).length > 0 &&
            checkRegistrations(Object.values(r.dependencies))
    );
    // 2. Check that there are no duplicate descriptions.
    const duplicateRegistration = registrations
        .map(r => r.identifier)
        .filter((item, index, array) => array.indexOf(item) !== index);
    if (duplicateRegistration.length > 0)
        throw new Error(
            `Found duplicate registration ${String(duplicateRegistration)}.`
        );
    return;
}

export function getLibraryConfig(absoluteFilePath: string) {
    const jiti = j(
        /*
        Credits to https://flaviocopes.com/fix-dirname-not-defined-es-module-scope/
        */
        absoluteFilePath,
        { cache: true, requireCache: false }
    );
    const configPath = getConfigFilePath();
    // Will throw a descriptive error if file does not exits ✅
    const libraryConfig = jiti(configPath).default as LibraryConfig | undefined;
    // Check default export ✅
    if (libraryConfig === undefined)
        throw new Error(
            `No default export found in ./${shortLibraryName}.config.ts`
        );
    return libraryConfig;
}

export async function getTransformConfig(
    cwdFolderPath = process.cwd()
): Promise<TransformConfig> {
    const libraryConfig = getLibraryConfig(__filename);
    // Process registrations in libraryconfig.
    checkRegistrations(libraryConfig.registrations);
    // Svelte specific data

    let svelteKitConfigData: TransformConfig["svelteKit"];

    try {
        const { default: svelteConfig } = (await import(
            /* @vite-ignore */
            pathToFileURL(
                path.resolve(cwdFolderPath, "svelte.config.js")
            ).toString()
        )) as { default: SvelteConfig };
        const files = {
            appTemplate: path.resolve(
                cwdFolderPath,
                svelteConfig.kit?.files?.appTemplate ||
                    path.resolve("src", "app.html")
            ),
            routes: path.resolve(
                cwdFolderPath,
                svelteConfig.kit?.files?.routes || path.resolve("src", "routes")
            ),
            serverHooks: path.resolve(
                cwdFolderPath,
                svelteConfig.kit?.files?.hooks?.server ||
                    path.resolve("src", "hooks.server")
            ),
        };

        const rootRoutesFolder = path.resolve(files.routes, "");

        // TODO: find a more reliable way (https://github.com/sveltejs/kit/issues/9937)
        const svelteKitVersion = (await import("@sveltejs/kit")).VERSION;
        svelteKitConfigData = {
            version: svelteKitVersion,
            files,
            rootRoutesFolder,
        };
    } catch (error) {
        console.log("Svelte detection failed. skipped.");
    }

    const usesTypeScript = await doesPathExist(
        path.resolve(cwdFolderPath, "tsconfig.json")
    );
    // eslint-disable-next-line no-async-promise-executor
    return {
        cwdFolderPath,
        debug: !!libraryConfig.debug,
        library: libraryConfig,
        usesTypeScript,
        svelteKit: svelteKitConfigData,
    };
}

/* const getInstalledVersionOfPackage = async (pkg: string) => {
    const pkgJsonPath = await findDepPkgJsonPath(pkg, cwdFolderPath);
    if (!pkgJsonPath) return undefined;

    const pkgJson = JSON.parse(
        await readFile(pkgJsonPath, { encoding: "utf-8" })
    );
    return pkgJson.version;
}; */
