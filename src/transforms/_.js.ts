import { parse } from "recast";
import type { TransformConfig } from "../config.js";
import { EmittedFiles, analyzeJsSvelte } from "./inject.js";
import { walk } from "estree-walker";
import MagicString from "magic-string";
import { PluginContext } from "rollup";

/* const value = d => [
  d("shadow", { gray: d("color", { black: "bg-black" }), green: "bg-green" }),
]

const d = (dep, values) => () => [`(() => {`, ...Object.entries(values).map(([k, v]) => 
`
if(${dep} === "${k}") {return ${typeof v === "string" ? `"${v}"` : v()};
}`
),`
})()`].join("")

const injected = value(d)

console.log(injected[0]())

const blue = 
`(
if(shadow === "gray") {return \`\${}\`;}
)()` */

export const transformJs = async (
    config: TransformConfig,
    code: string,
    emitted: EmittedFiles,
    rollupPluginContext: PluginContext
) => {
    const jsAst = parse(code);
    const { elementsToReplace, importsToAdd } = analyzeJsSvelte(
        jsAst,
        config.library.registrations,
        emitted,
        rollupPluginContext,
        walk
    );
    const s = new MagicString(code);
    elementsToReplace.forEach(e => {
        s.replaceAll(e.raw, e.declarableIdentifier);
    });
    importsToAdd.forEach((ref, declarableIdentifier) =>
        s.prepend(
            `import ${declarableIdentifier} from "${rollupPluginContext.getFileName(
                ref
            )}";\n`
        )
    );
    return { code: s.toString(), map: s.generateMap() };
};
