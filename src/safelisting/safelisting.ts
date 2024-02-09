import { readFile, writeFile } from "node:fs/promises";
import fs from "node:fs";
import path, { resolve } from "node:path";
import type { CompileResult, Registration } from "../register";
import uniq from "lodash.uniq";
import { configFileName, getLibraryConfig } from "../config/config";
import fg from "fast-glob";
import watcher, { AsyncSubscription } from "@parcel/watcher";
import xor from "lodash.xor";
import set from "lodash.set";
import get from "lodash.get";
import { transformSync } from "esbuild";
import { parse, walk } from "svelte/compiler";
import type {
    Ast,
    Attribute,
    MustacheTag,
} from "svelte/types/compiler/interfaces";
import {
    findMatchingRegistrations,
    nodeIsAttribute,
    nodeIsElement,
    nodeIsMustacheTag,
    nodeIsObjectExpression,
    resolveComponentName,
} from "../utils";
import type { ASTNode } from "ast-types";
import type { Node } from "estree";
import { shortLibraryName } from "../library.config";

function transpileSvelte(code: string) {
    const regex = /(?<=<script[^>]*>)[\S\s]*(?=<\/script[^>]*>)/g;
    return code.replaceAll(
        regex,
        match => transformSync(match, { loader: "ts" }).code
    );
}

export function getSafelistSvelte(
    markup: string,
    registrations: Registration[],
    tagNameDelimiter: string
) {
    const transpiled = transpileSvelte(markup);
    const ast: Ast = parse(transpiled);
    const safelist: string[] = [];
    walk(ast as unknown as Node, {
        enter(node: ASTNode) {
            if (nodeIsElement(node)) {
                const componentName = resolveComponentName(
                    node.name,
                    tagNameDelimiter
                );
                if (componentName !== undefined) {
                    const matchingRegistration = findMatchingRegistrations(
                        node.name.substring(
                            shortLibraryName.length + tagNameDelimiter.length
                        ),
                        /* getLibraryConfig(). */ registrations,
                        tagNameDelimiter
                    );
                    if (matchingRegistration) {
                        // Find the library attribute object expression
                        const libraryAttributeExpression = (
                            (
                                node.attributes.find(
                                    a =>
                                        nodeIsAttribute(a) &&
                                        a.name === shortLibraryName
                                ) as Attribute | undefined
                            )?.value.find(v => nodeIsMustacheTag(v)) as
                                | MustacheTag
                                | undefined
                        )?.expression;
                        if (
                            libraryAttributeExpression &&
                            nodeIsObjectExpression(libraryAttributeExpression)
                        ) {
                            // extract the library attribute object expression string
                            const evalString = transpiled.slice(
                                libraryAttributeExpression.start,
                                libraryAttributeExpression.end
                            );
                            // compile with found props
                            const evalResult = (0, eval)(
                                "(" + evalString + ")"
                            );
                            const compiled =
                                matchingRegistration.compile(evalResult);
                            safelist.push(...safelistFromCompiled(compiled));
                        }
                    }
                }
            }
        },
    });
    return safelist;
}

export async function reloadTailwind() {
    const libraryConfig = getLibraryConfig(__dirname);
    const tailwindPath = path.resolve(
        process.cwd(),
        libraryConfig.tailwindConfigPath
    );
    const fileContent = await readFile(tailwindPath, {
        encoding: "utf8",
    });
    await writeFile(tailwindPath, fileContent);
}

type GlobalSafelist = Map<string, string[]>;

export function setGlobalSafelist(safelist: [string, string[]][]) {
    set(global, `${shortLibraryName}.safelist`, new Map(safelist));
}

export function getGlobalSafelist() {
    return get(global, `${shortLibraryName}.safelist`) as
        | GlobalSafelist
        | undefined;
}

export function getGlobalSafelistValue(key: string) {
    return (
        get(global, `${shortLibraryName}.safelist`) as
            | GlobalSafelist
            | undefined
    )?.get(key);
}

export function setGlobalSafelistValue(key: string, value: string[]) {
    const currentSafelist = getGlobalSafelist();
    if (currentSafelist == undefined) setGlobalSafelist([[key, value]]);
    else currentSafelist.set(key, value);
}

export function setGlobalWatcherSubscription(w: AsyncSubscription) {
    set(global, `${shortLibraryName}.watcher`, w);
}

export function getGlobalWatcherSubscription() {
    return get(global, `${shortLibraryName}.watcher`) as
        | AsyncSubscription
        | undefined;
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

    function readSafelistEntry(path: string) {
        // read file
        const code = fs.readFileSync(path, { encoding: "utf8" });
        // process file to get safelist
        return getSafelistSvelte(
            code,
            libraryConfig.registrations,
            libraryConfig.tagNameDelimiter
        );
    }
    const fileList = fg.globSync(["src/**/*.svelte"], {
        dot: true,
        absolute: true,
    });
    // Init safelist
    // On initial load, read all corresponding files.
    setGlobalSafelist(
        fileList.map(path => [path, readSafelistEntry(path)] as const)
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
                        await reloadTailwind();
                    } else if (path.endsWith(".svelte")) {
                        const newSafelistEntry = readSafelistEntry(path);
                        if (
                            xor(
                                uniq(getGlobalSafelistValue(path)),
                                uniq(newSafelistEntry)
                            ).length > 0
                        ) {
                            if (libraryConfig.debug)
                                console.log(
                                    `Safelist has changed. Restarting tailwind...`
                                );
                        }
                        await reloadTailwind();
                    }
                }
            })
            .then(w => setGlobalWatcherSubscription(w));
    }
    // Convert safelist map to array
    const finalSafelist = getGlobalSafelist();
    if (!finalSafelist) return [];
    return uniq([...finalSafelist.values()].flatMap(c => c));
}

export function safelistFromCompiled(compiled: CompileResult): string[] {
    return [
        ...Object.values(compiled.styles).flatMap(s => s),
        ...Object.values(compiled.children).flatMap(c =>
            safelistFromCompiled(c)
        ),
    ];
}
