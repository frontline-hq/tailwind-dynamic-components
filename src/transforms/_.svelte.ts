import { parse, preprocess } from "svelte/compiler";
import type { TransformConfig } from "../config/config.js";
import { EmittedFiles, analyzeJsSvelte } from "./inject.js";
import MagicString, { SourceMap } from "magic-string";
import { Program } from "estree";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { asyncWalk } from "estree-walker";

export const transformSvelte = async (
    config: TransformConfig,
    code: string,
    emitted: EmittedFiles
) => {
    const transformed = await preprocess(code, [
        vitePreprocess({ script: true, style: true }),
        {
            markup: async ({ content }) => {
                const svelteAst = parse(content);
                const s = new MagicString(content);

                const { elementsToReplace, importsToAdd } =
                    await analyzeJsSvelte(
                        svelteAst,
                        config.library.registrations,
                        emitted,
                        asyncWalk
                    );

                const instanceContent = svelteAst.instance?.content as
                    | (Program & { start: number; end: number })
                    | undefined;

                if (!svelteAst.instance) s.appendRight(0, "<script>");
                importsToAdd.forEach((ref, declarableIdentifier) =>
                    s.appendRight(
                        instanceContent?.start ?? 0,
                        `import ${declarableIdentifier} from "${ref}";\n`
                    )
                );
                if (!svelteAst.instance) s.appendRight(0, "</script>");
                elementsToReplace.forEach(e => {
                    if (e.type === "attribute") {
                        s.update(
                            e.start,
                            e.end,
                            `${e.name}={${e.declarableIdentifier}}`
                        );
                    } else {
                        s.update(e.start, e.end, e.declarableIdentifier);
                    }
                });
                return {
                    code: s.toString(),
                    map: s.generateMap(),
                };
            },
        },
    ]);
    // Insert script tag if we don't have one

    return { code: transformed.code, map: transformed.map as SourceMap };
};
