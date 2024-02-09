import { readFile, writeFile } from "node:fs/promises";
import fs from "node:fs";
import { resolve } from "node:path";
import { CompileResult } from "../register";
import uniq from "lodash.uniq";
import { configFileName, getLibraryConfig } from "../config/config";
import fg from "fast-glob";
import { getSafelistSvelte } from "../transforms/inject";
import watcher, { AsyncSubscription } from "@parcel/watcher";
import difference from "lodash.difference";

export async function reloadTailwind() {
    const fileContent = await readFile(__filename, {
        encoding: "utf8",
    });
    await writeFile(__filename, fileContent);
}

export function setGlobalWatcherSubscription(w: AsyncSubscription) {
    (global as unknown as { watcher?: AsyncSubscription }).watcher = w;
}

export function getGlobalWatcherSubscription() {
    return (global as unknown as { watcher?: AsyncSubscription }).watcher;
}

export function getDynamicSafelist() {
    process.on("SIGINT", () => {
        // close watcher when Ctrl-C is pressed
        const w = getGlobalWatcherSubscription();
        if (w) w.unsubscribe();

        process.exit(0);
    });
    // Retrieve library config
    const libraryConfig = getLibraryConfig(__dirname);
    // Look at .svelte files

    function readSafelist(path: string) {
        // read file
        const code = fs.readFileSync(path, { encoding: "utf8" });
        // process file to get safelist
        const safelist = getSafelistSvelte(
            code,
            libraryConfig.registrations,
            libraryConfig.tagNameDelimiter
        );
        return safelist;
    }
    const fileList = fg.globSync(["src/**/*.svelte"], {
        dot: true,
        absolute: true,
    });
    // Init safelist
    // On initial load, read all corresponding files.
    const safelist = new Map<string, string[]>(
        fileList.map(path => [path, readSafelist(path)] as const)
    );

    // Setup change watcher
    if (!getGlobalWatcherSubscription()) {
        watcher
            .subscribe(resolve(process.cwd(), "./src"), async (_, events) => {
                for (const { path } of events) {
                    if (
                        path.endsWith(configFileName) ||
                        path.endsWith(".tdc.ts")
                    ) {
                        if (libraryConfig.debug)
                            console.log(
                                `Safelist might have changed. Restarting tailwind...`
                            );
                        reloadTailwind();
                    } else if (path.endsWith(".svelte")) {
                        const newSafelist = readSafelist(path);
                        if (
                            difference(safelist.get(path), newSafelist).length >
                            0
                        ) {
                            if (libraryConfig.debug)
                                console.log(
                                    `Safelist has changed. Restarting tailwind...`
                                );
                            reloadTailwind();
                        }
                    }
                }
            })
            .then(w => setGlobalWatcherSubscription(w));
    }
    // Convert safelist map to array
    return uniq([...safelist.values()].flatMap(c => c));
}

export function safelistFromCompiled(compiled: CompileResult): string[] {
    return [
        ...Object.values(compiled.styles).flatMap(s => s),
        ...Object.values(compiled.children).flatMap(c =>
            safelistFromCompiled(c)
        ),
    ];
}
