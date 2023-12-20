import { describe, test, vi, expect } from "vitest";
import { newEmittedFiles, analyzeJsSvelte } from "./inject";
import { parse as jsParse } from "recast";
import { EmitFile, EmittedChunk, PluginContext } from "rollup";
import { shortLibraryName } from "../library.config";
import { walk } from "estree-walker";
import { parse as svelteParse, walk as svelteWalk } from "svelte/compiler";
import { Styles } from "../register";

export const styles1 = new Styles("b0is");
export const styles2 = new Styles("b0is", { variants: ["sm", "md"] });
export const styles3 = new Styles("b0is", {
    dependencies: {
        color: ["blue", "gray"],
        heights: ["one", "two"],
    },
});

const getFileReference = (identifier: string) =>
    `ref-${shortLibraryName}-${identifier}`;
const getEmittedFiles = (literals: string[]) =>
    getIdentifiers(literals).map(
        i =>
            [
                i,
                {
                    styles: styles3,
                    fileReference: getFileReference(i),
                },
            ] as const
    );

const getIdentifiers = (literals: string[]) =>
    literals.map(l => styles3.getIdentifier(l));

export const jsTestCode01 = `
    // Match
    const a = "b0is";
    const b = \`md:b0is\`;
    const c = 'hover:md:b0is';
    // identifier of md:b0is is reserved
    const UvbZZuJVSa = "something";
    // Do not match
    const d = \`hover:md:\${a}\`;
    `;

export const svelteTestCode01 = `
<script>${jsTestCode01}</script>

<!-- Match -->
<Component some-prop="b0is"/>
<Component some-prop={"md:b0is"} />
<Component some-prop={'hover:md:b0is'} />
<Component some-prop={\`hover:md:b0is\`} />
<Component some-prop=hover:md:b0is />

<!-- Do not match -->
<Component some-prop="ab0is" />
`;

const jsEmitted = newEmittedFiles();
const svelteEmitted = newEmittedFiles();
const emitFileSpy = vi.fn(({ id }: EmittedChunk) => "ref-" + id) as EmitFile;

const literals = ["b0is", "md:b0is", "hover:md:b0is"];
const jsAst = jsParse(jsTestCode01);
const jsResult = analyzeJsSvelte(
    jsAst,
    [styles3],
    jsEmitted,
    { emitFile: emitFileSpy } as PluginContext,
    walk
);
const svelteAst = svelteParse(svelteTestCode01);
const svelteResult = analyzeJsSvelte(
    svelteAst,
    [styles3],
    svelteEmitted,
    { emitFile: emitFileSpy } as PluginContext,
    svelteWalk
);
export const js01ResultReference = {
    emittedFiles: new Map(getEmittedFiles(literals)),
    importsToAdd: new Map([
        ["DFutYsdTuNsmYdtaFQU", "ref-tdc-DFutYsdTuNsmYdtaFQU"],
        ["FroHnY", "ref-tdc-FroHnY"],
        ["UvbZZuJVSa_", "ref-tdc-UvbZZuJVSa"],
    ]),
    elementsToReplace: [
        {
            declarableIdentifier: "FroHnY",
            end: undefined,
            raw: '"b0is"',
            start: undefined,
            type: "literal",
            value: "b0is",
        },
        {
            declarableIdentifier: "UvbZZuJVSa_",
            end: undefined,
            raw: "`md:b0is`",
            start: undefined,
            type: "template",
            value: "md:b0is",
        },
        {
            declarableIdentifier: "DFutYsdTuNsmYdtaFQU",
            end: undefined,
            raw: "'hover:md:b0is'",
            start: undefined,
            type: "literal",
            value: "hover:md:b0is",
        },
    ],
};
export const svelte01ResultReference = {
    emittedFiles: new Map(getEmittedFiles(literals)),
    importsToAdd: new Map([
        ["FroHnY", "ref-tdc-FroHnY"],
        ["UvbZZuJVSa_", "ref-tdc-UvbZZuJVSa"],
        ["DFutYsdTuNsmYdtaFQU", "ref-tdc-DFutYsdTuNsmYdtaFQU"],
    ]),
    elementsToReplace: [
        {
            declarableIdentifier: "FroHnY",
            end: 286,
            name: "some-prop",
            raw: "b0is",
            start: 270,
            type: "attribute",
            value: "b0is",
        },
        {
            declarableIdentifier: "UvbZZuJVSa_",
            end: 320,
            raw: '"md:b0is"',
            start: 311,
            type: "literal",
            value: "md:b0is",
        },
        {
            declarableIdentifier: "DFutYsdTuNsmYdtaFQU",
            end: 362,
            raw: "'hover:md:b0is'",
            start: 347,
            type: "literal",
            value: "hover:md:b0is",
        },
        {
            declarableIdentifier: "DFutYsdTuNsmYdtaFQU",
            end: 404,
            raw: "`hover:md:b0is`",
            start: 389,
            type: "template",
            value: "hover:md:b0is",
        },
        {
            declarableIdentifier: "DFutYsdTuNsmYdtaFQU",
            end: 443,
            name: "some-prop",
            raw: "hover:md:b0is",
            start: 420,
            type: "attribute",
            value: "hover:md:b0is",
        },
        {
            declarableIdentifier: "FroHnY",
            end: 43,
            raw: '"b0is"',
            start: 37,
            type: "literal",
            value: "b0is",
        },
        {
            declarableIdentifier: "UvbZZuJVSa_",
            end: 68,
            raw: "`md:b0is`",
            start: 59,
            type: "template",
            value: "md:b0is",
        },
        {
            declarableIdentifier: "DFutYsdTuNsmYdtaFQU",
            end: 99,
            raw: "'hover:md:b0is'",
            start: 84,
            type: "literal",
            value: "hover:md:b0is",
        },
    ],
};

describe("analyze", () => {
    describe("js", () => {
        test("Template and regular literals", () => {
            expect(jsResult).toEqual(js01ResultReference);
        });
        // Add imports first, then inject literals with declarable identifiers
        /*        test("replaceLiterals", () => {
            result.replaceLiterals();
            expect(dedent(print(jsAst).code))
                .toMatchInlineSnapshot(dedent`"// Match
                    const a = FroHnY;
                    const b = UvbZZuJVSa;
                    // Do not match
                    const c = \`hover:md:\${a}\`;"`);
        }); */
    });
    describe("svelte", () => {
        test("Template and regular literals", () => {
            expect(svelteResult).toEqual(svelte01ResultReference);
        });
    });
});
