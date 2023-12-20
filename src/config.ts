import path from "node:path";
import { readFile, writeFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { Config as SvelteConfig } from "@sveltejs/kit";
import { findDepPkgJsonPath } from "vitefu";
import { libraryName } from "./library.config";
import { CompoundStyles, Styles } from "./register";

const configFileName = `${libraryName}.config.js`;

const cwdFolderPath = process.cwd();
const libraryConfigFilePath = path.resolve(cwdFolderPath, configFileName);

export const doesPathExist = async (path: string) =>
    !!(await stat(path).catch(() => false));

type VersionString = `${number}.${number}.${number}`;

type LibraryConfigModule = {
    defineConfig: DefineConfig;
};

type LibraryConfig = {
    debug: boolean;
    registrations: Array<CompoundStyles | Styles>;
};

type DefineConfig = () => LibraryConfig;

export type TransformConfig = {
    cwdFolderPath: string;
    debug?: boolean;
    usesTypeScript: boolean;
    library: LibraryConfig;
    svelteKit?: {
        version: VersionString | undefined;
        rootRoutesFolder: string;
        files: {
            appTemplate: string;
            routes: string;
            serverHooks: string;
        };
    };
};

export const getTransformConfig = async (): Promise<TransformConfig> => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<TransformConfig>(async resolve => {
        await createLibraryConfigIfNotPresentYet();

        const libraryConfigModule = (await import(
            pathToFileURL(libraryConfigFilePath).toString()
        )) as LibraryConfigModule;
        const libraryConfig = await libraryConfigModule.defineConfig();

        // Svelte specific data

        let svelteKitConfigData: TransformConfig["svelteKit"];

        try {
            const { default: svelteConfig } = (await import(
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
                    svelteConfig.kit?.files?.routes ||
                        path.resolve("src", "routes")
                ),
                serverHooks: path.resolve(
                    cwdFolderPath,
                    svelteConfig.kit?.files?.hooks?.server ||
                        path.resolve("src", "hooks.server")
                ),
            };

            const rootRoutesFolder = path.resolve(files.routes, "");

            // TODO: find a more reliable way (https://github.com/sveltejs/kit/issues/9937)
            const svelteKitVersion =
                await getInstalledVersionOfPackage("@sveltejs/kit");
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
        resolve({
            cwdFolderPath,
            debug: !!libraryConfig.debug,
            library: libraryConfig,
            usesTypeScript,
            svelteKit: svelteKitConfigData,
        });
    });
};

const createLibraryConfigIfNotPresentYet = async () => {
    const libraryConfigExists = await doesPathExist(libraryConfigFilePath);
    if (libraryConfigExists) return;

    /* TODO: Inject config type definitin into defineConfig file */

    return writeFile(
        libraryConfigFilePath,
        `
export async function defineConfig() {
	return {
		debug: false,
        /* Styles within CompoundStyles have to be registered seperately for their detection */
        registrations: []
	}
}
`
    );
};

const getInstalledVersionOfPackage = async (pkg: string) => {
    const pkgJsonPath = await findDepPkgJsonPath(pkg, cwdFolderPath);
    if (!pkgJsonPath) return undefined;

    const pkgJson = JSON.parse(
        await readFile(pkgJsonPath, { encoding: "utf-8" })
    );
    return pkgJson.version;
};
