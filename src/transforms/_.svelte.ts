import { preprocess } from "svelte/compiler";
import type { TransformConfig } from "../config/config.js";
import { analyze } from "./inject.js";
import MagicString, { SourceMap } from "magic-string";
import { Program } from "estree";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export const transformSvelte = async (
    config: TransformConfig,
    code: string
) => {
    const transformed = await preprocess(code, [
        vitePreprocess({ script: true, style: true }),
        {
            markup: async ({ content }) => {
                const s = new MagicString(content);

                const { elementsToReplace, importsToAdd, ast } = await analyze(
                    content,
                    config.library.registrations,
                    config.library.tagNameDelimiter
                );

                const instanceContent = ast.instance?.content as
                    | (Program & { start: number; end: number })
                    | undefined;

                if (!ast.instance) s.appendRight(0, "<script>");
                importsToAdd.forEach((ref, declarableIdentifier) =>
                    s.appendRight(
                        instanceContent?.start ?? 0,
                        `import {${declarableIdentifier}} from "${ref}";\n`
                    )
                );
                if (!ast.instance) s.appendRight(0, "</script>");
                elementsToReplace.forEach(e =>
                    s.update(e.start, e.end, e.transformed)
                );
                return {
                    code: s.toString(),
                    map: s.generateMap(),
                    dependencies: [...importsToAdd.keys()],
                };
            },
        },
    ]);
    // Insert script tag if we don't have one

    return {
        code: transformed.code,
        map: transformed.map as SourceMap,
    };
};
