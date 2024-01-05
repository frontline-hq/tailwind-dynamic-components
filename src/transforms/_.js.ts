import { parse } from "recast";
import type { TransformConfig } from "../config/config.js";
import { EmittedFiles, analyzeJsSvelte } from "./inject.js";
import MagicString from "magic-string";

export const transformJs = async (
    config: TransformConfig,
    code: string,
    emitted: EmittedFiles
) => {
    const jsAst = parse(code, { parser: await import("acorn") });
    const { elementsToReplace, importsToAdd } = await analyzeJsSvelte(
        jsAst,
        config.library.registrations,
        emitted,
        (await import("estree-walker")).asyncWalk
    );
    const s = new MagicString(code);

    elementsToReplace.forEach(e => {
        s.update(e.start, e.end, e.declarableIdentifier);
    });
    importsToAdd.forEach((ref, declarableIdentifier) =>
        s.prepend(`import ${declarableIdentifier} from "${ref}";\n`)
    );
    return { code: s.toString(), map: s.generateMap() };
};
