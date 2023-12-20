import { parse, preprocess, walk } from "svelte/compiler";
import type { TransformConfig } from "../config.js";
import { vitePreprocess } from "@sveltejs/kit/vite";
import { EmittedFiles, analyzeJsSvelte } from "./inject.js";
import type { PluginContext } from "rollup";
import MagicString from "magic-string";

export const transformSvelte = async (
    config: TransformConfig,
    code: string,
    emitted: EmittedFiles,
    rollupPluginContext: PluginContext
) => {
    // First, we need to remove typescript statements from script tag
    const codeWithoutTypes = (
        await preprocess(code, vitePreprocess({ script: true, style: true }))
    ).code;

    // Insert script tag if we don't have one
    const svelteAst = parse(codeWithoutTypes);
    const { elementsToReplace, importsToAdd } = analyzeJsSvelte(
        svelteAst,
        config.library.registrations,
        emitted,
        rollupPluginContext,
        walk
    );
    const processed = await preprocess(codeWithoutTypes, {
        script: async options => {
            const s = new MagicString(options.content);
            // Add imports
            importsToAdd.forEach((ref, declarableIdentifier) =>
                s.prepend(
                    `import ${declarableIdentifier} from "${rollupPluginContext.getFileName(
                        ref
                    )}";\n`
                )
            );
            // TODO: Also return map
            return { code: s.toString(), map: s.generateMap() };
        },
        markup: options => {
            const s = new MagicString(options.content);
            // Replace raw literals with declarable identifiers
            elementsToReplace
                .filter(
                    e =>
                        e.start >= svelteAst.html?.start &&
                        e.end <= svelteAst.html?.end
                )
                .forEach(e => {
                    if (e.type === "attribute") {
                        s.update(
                            e.start + 1 - svelteAst.html?.start,
                            e.end + 1 - svelteAst.html?.start,
                            `${e.name}={${e.declarableIdentifier}}`
                        );
                    } else {
                        s.update(
                            e.start + 1 - svelteAst.html?.start,
                            e.end + 1 - svelteAst.html?.start,
                            e.declarableIdentifier
                        );
                    }
                });
            // TODO: Also return map
            return { code: s.toString(), map: s.generateMap() };
        },
    });
    return processed;
};
