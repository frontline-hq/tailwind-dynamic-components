import path from "path";
import { writeFile, stat /* readFile */ } from "fs/promises";
import { pathToFileURL } from "url";
/* import { VERSION } from "@sveltejs/kit"; */
import type { Config as SvelteConfig } from "@sveltejs/kit";
/* import { findDepPkgJsonPath } from "vitefu"; */
import { libraryName } from "../library.config";
import { CompoundStyles, Styles } from "../register";

export const configFileName = `${libraryName}.config.js` as const;

const cwdFolderPath = process.cwd();
const getLibraryConfigFilePath = async (directory: string = process.cwd()) =>
    path.resolve(await findConfigFileFolder(directory), configFileName);

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
        version: string;
        rootRoutesFolder: string;
        files: {
            appTemplate: string;
            routes: string;
            serverHooks: string;
        };
    };
};

export function flattenAndCheckRegistrations(
    registrations: Array<CompoundStyles | Styles>
) {
    // 1. Add all subregistrations of CompoundStyles
    const completeRegistrations = registrations.flatMap((r, _, arr) => {
        if (r instanceof CompoundStyles)
            return [r, ...Object.values(r.styles)] as typeof arr;
        return [r];
    });

    // 2. Check that there are no duplicate descriptions.
    const duplicateRegistration = completeRegistrations
        .map(r => r.description)
        .filter((item, index, array) => array.indexOf(item) !== index);
    if (duplicateRegistration.length > 0)
        throw new Error(
            `Found duplicate registration ${String(duplicateRegistration)}.`
        );
    return completeRegistrations;
}

export async function getTransformConfig(
    directory: string = process.cwd()
): Promise<TransformConfig> {
    await createLibraryConfigIfNotPresentYet();

    const libraryConfigModule = (await import(
        pathToFileURL(await getLibraryConfigFilePath(directory)).toString()
    )) as LibraryConfigModule;
    const libraryConfig = await libraryConfigModule.defineConfig();

    // Process registrations in libraryconfig.
    const completeRegistrations = flattenAndCheckRegistrations(
        libraryConfig.registrations
    );
    libraryConfig.registrations = completeRegistrations;
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

const createLibraryConfigIfNotPresentYet = async (
    directory: string = process.cwd()
) => {
    const libraryConfigExists = await doesPathExist(
        await getLibraryConfigFilePath(directory)
    );
    if (libraryConfigExists) return;

    /* TODO: Inject config type definitin into defineConfig file */

    return writeFile(
        await getLibraryConfigFilePath(directory),
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

/* const getInstalledVersionOfPackage = async (pkg: string) => {
    const pkgJsonPath = await findDepPkgJsonPath(pkg, cwdFolderPath);
    if (!pkgJsonPath) return undefined;

    const pkgJson = JSON.parse(
        await readFile(pkgJsonPath, { encoding: "utf-8" })
    );
    return pkgJson.version;
}; */
