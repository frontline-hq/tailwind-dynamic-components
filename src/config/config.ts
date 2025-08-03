import path from "path";
import { stat, readFile } from "fs/promises";
import { pathToFileURL } from "url";
/* import { VERSION } from "@sveltejs/kit"; */
import type { SvelteConfig } from "@sveltejs/vite-plugin-svelte";

import { shortLibraryName } from "../library.config";
import { Manipulation, Registration, mergeManipulations } from "../register";
import j from "jiti";

type KitConfig = {
    files?: {
        /**
         * a place to put static files that should have stable URLs and undergo no processing, such as `favicon.ico` or `manifest.json`
         * @default "static"
         */
        assets?: string;
        hooks?: {
            /**
             * The location of your client [hooks](https://svelte.dev/docs/kit/hooks).
             * @default "src/hooks.client"
             */
            client?: string;
            /**
             * The location of your server [hooks](https://svelte.dev/docs/kit/hooks).
             * @default "src/hooks.server"
             */
            server?: string;
            /**
             * The location of your universal [hooks](https://svelte.dev/docs/kit/hooks).
             * @default "src/hooks"
             * @since 2.3.0
             */
            universal?: string;
        };
        /**
         * your app's internal library, accessible throughout the codebase as `$lib`
         * @default "src/lib"
         */
        lib?: string;
        /**
         * a directory containing [parameter matchers](https://svelte.dev/docs/kit/advanced-routing#Matching)
         * @default "src/params"
         */
        params?: string;
        /**
         * the files that define the structure of your app (see [Routing](https://svelte.dev/docs/kit/routing))
         * @default "src/routes"
         */
        routes?: string;
        /**
         * the location of your service worker's entry point (see [Service workers](https://svelte.dev/docs/kit/service-workers))
         * @default "src/service-worker"
         */
        serviceWorker?: string;
        /**
         * the location of the template for HTML responses
         * @default "src/app.html"
         */
        appTemplate?: string;
        /**
         * the location of the template for fallback error responses
         * @default "src/error.html"
         */
        errorTemplate?: string;
    };
};

// copied from svelte config
interface Config extends SvelteConfig {
    /**
     * SvelteKit options.
     *
     * @see https://svelte.dev/docs/kit/configuration
     */
    kit?: KitConfig;
}

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
    manipulations: Array<Manipulation>;
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

export function checkManipulations(manipulations: Array<Manipulation>) {
    // 2. Check that there are no duplicate descriptions.
    const duplicate = manipulations
        .map(r => r.identifier)
        .filter((item, index, array) => array.indexOf(item) !== index);
    if (duplicate.length > 0)
        throw new Error(`Found duplicate manipulation ${String(duplicate)}.`);
    return;
}

export function getLibraryConfig() {
    const jiti = j(
        /*
        Credits to https://flaviocopes.com/fix-dirname-not-defined-es-module-scope/
        */
        process.cwd(),
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
    // Merge manipulations and registrations
    return {
        ...libraryConfig,
        registrations: mergeManipulations(
            libraryConfig.registrations,
            libraryConfig.manipulations
        ),
    } as LibraryConfig;
}

export async function getTransformConfig(
    cwdFolderPath = process.cwd()
): Promise<TransformConfig> {
    const libraryConfig = getLibraryConfig();
    // Process registrations in libraryconfig.
    checkRegistrations(libraryConfig.registrations);
    // Process manipulations in libraryconfig
    checkManipulations(libraryConfig.manipulations);
    // Svelte specific data

    let svelteKitConfigData: TransformConfig["svelteKit"];

    try {
        const { default: svelteConfig } = (await import(
            /* @vite-ignore */
            pathToFileURL(
                path.resolve(cwdFolderPath, "svelte.config.js")
            ).toString()
        )) as { default: Config };
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
        const svelteKitPkg = JSON.parse(
            await readFile(
                path.resolve(
                    cwdFolderPath,
                    "node_modules/@sveltejs/kit/package.json"
                ),
                "utf-8"
            )
        );
        svelteKitConfigData = {
            version: svelteKitPkg.version,
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
