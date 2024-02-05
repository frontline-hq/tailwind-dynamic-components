import { describe, test, expect } from "vitest";
import {
    newEmittedFiles,
    analyzeJsSvelte,
    findMatchingRegistrations,
    resolveComponentName,
    analyze,
} from "./inject";
import { parse as jsParse } from "recast";
import { asyncWalk } from "estree-walker";
import { parse as svelteParse } from "svelte/compiler";
import { CompoundStyles, Registration, Styles } from "../register";
import { flattenAndCheckRegistrations } from "../config/config";
import { shortLibraryName } from "../library.config";
import dedent from "ts-dedent";

export const styles1 = new Styles("b0is");
export const styles2 = new Styles("b0is", { variants: ["sm", "md"] });
export const styles3 = new Styles("b0is", {
    dependencies: {
        color: ["blue", "gray"],
        heights: ["one", "two"],
    },
});
const compoundStyle = new CompoundStyles("b0s").addInline("b0as");

export const jsTestCode01 = `
    // Match
    const a = "b0is";
    const b = \`md:b0is\`;
    const c = 'hover:md:b0is';
    const f = "b0as";
    const g = "b0s";
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
<Component some-prop=hover:md:b0s />

<!-- Do not match -->
<Component some-prop="ab0is" />
`;
const jsAst = jsParse(jsTestCode01);
const svelteAst = svelteParse(svelteTestCode01);

describe("analyze old", () => {
    describe("js", () => {
        test("elements to replace", async () => {
            expect(
                (
                    await analyzeJsSvelte(
                        jsAst,
                        flattenAndCheckRegistrations([styles3, compoundStyle]),
                        newEmittedFiles(),
                        asyncWalk
                    )
                ).elementsToReplace
            ).toMatchInlineSnapshot(`
              [
                {
                  "declarableIdentifier": "FroHnY",
                  "end": undefined,
                  "start": undefined,
                  "type": "literal",
                  "value": "b0is",
                },
                {
                  "declarableIdentifier": "UvbZZuJVSa_",
                  "end": undefined,
                  "start": undefined,
                  "type": "template",
                  "value": "md:b0is",
                },
                {
                  "declarableIdentifier": "DFutYsdTuNsmYdtaFQU",
                  "end": undefined,
                  "start": undefined,
                  "type": "literal",
                  "value": "hover:md:b0is",
                },
                {
                  "declarableIdentifier": "FroGui",
                  "end": undefined,
                  "start": undefined,
                  "type": "literal",
                  "value": "b0as",
                },
                {
                  "declarableIdentifier": "BFkFG",
                  "end": undefined,
                  "start": undefined,
                  "type": "literal",
                  "value": "b0s",
                },
              ]
            `);
        });
        describe("imports to add", () => {
            test("registrations with missing sub style from compoundStyle", async () => {
                expect(
                    (
                        await analyzeJsSvelte(
                            jsAst,
                            flattenAndCheckRegistrations([
                                styles3,
                                compoundStyle,
                            ]),
                            newEmittedFiles(),
                            asyncWalk
                        )
                    ).importsToAdd
                ).toMatchInlineSnapshot(`
                  Map {
                    "FroHnY" => "virtual:tdc-FroHnY",
                    "UvbZZuJVSa_" => "virtual:tdc-UvbZZuJVSa",
                    "DFutYsdTuNsmYdtaFQU" => "virtual:tdc-DFutYsdTuNsmYdtaFQU",
                    "FroGui" => "virtual:tdc-FroGui",
                    "BFkFG" => "virtual:tdc-BFkFG",
                  }
                `);
            });
            test("registrations with sub style from compoundStyle", async () => {
                expect(
                    (
                        await analyzeJsSvelte(
                            jsAst,
                            flattenAndCheckRegistrations([
                                styles3,
                                compoundStyle,
                            ]),
                            newEmittedFiles(),
                            asyncWalk
                        )
                    ).importsToAdd
                ).toMatchInlineSnapshot(`
                  Map {
                    "FroHnY" => "virtual:tdc-FroHnY",
                    "UvbZZuJVSa_" => "virtual:tdc-UvbZZuJVSa",
                    "DFutYsdTuNsmYdtaFQU" => "virtual:tdc-DFutYsdTuNsmYdtaFQU",
                    "FroGui" => "virtual:tdc-FroGui",
                    "BFkFG" => "virtual:tdc-BFkFG",
                  }
                `);
            });
        });
        test("emitted files", async () => {
            expect(
                (
                    await analyzeJsSvelte(
                        jsAst,
                        flattenAndCheckRegistrations([styles3, compoundStyle]),
                        newEmittedFiles(),
                        asyncWalk
                    )
                ).emittedFiles
            ).toMatchInlineSnapshot(`
              Map {
                "FroHnY" => {
                  "fileReference": "virtual:tdc-FroHnY",
                  "styles": "export default ({color, heights} = {}) => \`\`",
                },
                "UvbZZuJVSa" => {
                  "fileReference": "virtual:tdc-UvbZZuJVSa",
                  "styles": "export default ({color, heights} = {}) => \`\`",
                },
                "DFutYsdTuNsmYdtaFQU" => {
                  "fileReference": "virtual:tdc-DFutYsdTuNsmYdtaFQU",
                  "styles": "export default ({color, heights} = {}) => \`\`",
                },
                "FroGui" => {
                  "fileReference": "virtual:tdc-FroGui",
                  "styles": "export default ({} = {}) => \`\`",
                },
                "BFkFG" => {
                  "fileReference": "virtual:tdc-BFkFG",
                  "styles": "import USKtRmcqhVTaNLtGHTvY from \\"virtual:tdc-USKtRmcqhVTaNLtGHTvY\\";

              export default {
                  b0as: USKtRmcqhVTaNLtGHTvY
              };",
                },
                "USKtRmcqhVTaNLtGHTvY" => {
                  "fileReference": "virtual:tdc-USKtRmcqhVTaNLtGHTvY",
                  "styles": "export default ({} = {}) => \`\`",
                },
              }
            `);
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
        test("elements to replace", async () => {
            expect(
                (
                    await analyzeJsSvelte(
                        svelteAst,
                        flattenAndCheckRegistrations([styles3, compoundStyle]),
                        newEmittedFiles(),
                        asyncWalk
                    )
                ).elementsToReplace
            ).toMatchInlineSnapshot(`
              [
                {
                  "declarableIdentifier": "FroHnY",
                  "end": 329,
                  "name": "some-prop",
                  "start": 313,
                  "type": "attribute",
                  "value": "b0is",
                },
                {
                  "declarableIdentifier": "UvbZZuJVSa_",
                  "end": 363,
                  "start": 354,
                  "type": "literal",
                  "value": "md:b0is",
                },
                {
                  "declarableIdentifier": "DFutYsdTuNsmYdtaFQU",
                  "end": 405,
                  "start": 390,
                  "type": "literal",
                  "value": "hover:md:b0is",
                },
                {
                  "declarableIdentifier": "DFutYsdTuNsmYdtaFQU",
                  "end": 447,
                  "start": 432,
                  "type": "template",
                  "value": "hover:md:b0is",
                },
                {
                  "declarableIdentifier": "DFutYsdTuNsmYdtaFQU",
                  "end": 486,
                  "name": "some-prop",
                  "start": 463,
                  "type": "attribute",
                  "value": "hover:md:b0is",
                },
                {
                  "declarableIdentifier": "fNzbMeyhNLtAQkweV",
                  "end": 523,
                  "name": "some-prop",
                  "start": 501,
                  "type": "attribute",
                  "value": "hover:md:b0s",
                },
                {
                  "declarableIdentifier": "FroHnY",
                  "end": 43,
                  "start": 37,
                  "type": "literal",
                  "value": "b0is",
                },
                {
                  "declarableIdentifier": "UvbZZuJVSa_",
                  "end": 68,
                  "start": 59,
                  "type": "template",
                  "value": "md:b0is",
                },
                {
                  "declarableIdentifier": "DFutYsdTuNsmYdtaFQU",
                  "end": 99,
                  "start": 84,
                  "type": "literal",
                  "value": "hover:md:b0is",
                },
                {
                  "declarableIdentifier": "FroGui",
                  "end": 121,
                  "start": 115,
                  "type": "literal",
                  "value": "b0as",
                },
                {
                  "declarableIdentifier": "BFkFG",
                  "end": 142,
                  "start": 137,
                  "type": "literal",
                  "value": "b0s",
                },
              ]
            `);
        });
        describe("imports to add", () => {
            test("registrations with missing sub style from compoundStyle", async () => {
                expect(
                    (
                        await analyzeJsSvelte(
                            svelteAst,
                            flattenAndCheckRegistrations([
                                styles3,
                                compoundStyle,
                            ]),
                            newEmittedFiles(),
                            asyncWalk
                        )
                    ).importsToAdd
                ).toMatchInlineSnapshot(`
                  Map {
                    "FroHnY" => "virtual:tdc-FroHnY",
                    "UvbZZuJVSa_" => "virtual:tdc-UvbZZuJVSa",
                    "DFutYsdTuNsmYdtaFQU" => "virtual:tdc-DFutYsdTuNsmYdtaFQU",
                    "fNzbMeyhNLtAQkweV" => "virtual:tdc-fNzbMeyhNLtAQkweV",
                    "FroGui" => "virtual:tdc-FroGui",
                    "BFkFG" => "virtual:tdc-BFkFG",
                  }
                `);
            });
            test("registrations with sub style from compoundStyle", async () => {
                expect(
                    (
                        await analyzeJsSvelte(
                            svelteAst,
                            flattenAndCheckRegistrations([
                                styles3,
                                compoundStyle,
                            ]),
                            newEmittedFiles(),
                            asyncWalk
                        )
                    ).importsToAdd
                ).toMatchInlineSnapshot(`
                  Map {
                    "FroHnY" => "virtual:tdc-FroHnY",
                    "UvbZZuJVSa_" => "virtual:tdc-UvbZZuJVSa",
                    "DFutYsdTuNsmYdtaFQU" => "virtual:tdc-DFutYsdTuNsmYdtaFQU",
                    "fNzbMeyhNLtAQkweV" => "virtual:tdc-fNzbMeyhNLtAQkweV",
                    "FroGui" => "virtual:tdc-FroGui",
                    "BFkFG" => "virtual:tdc-BFkFG",
                  }
                `);
            });
        });
        test("emitted files", async () => {
            expect(
                (
                    await analyzeJsSvelte(
                        svelteAst,
                        flattenAndCheckRegistrations([styles3, compoundStyle]),
                        newEmittedFiles(),
                        asyncWalk
                    )
                ).emittedFiles
            ).toMatchInlineSnapshot(`
              Map {
                "FroHnY" => {
                  "fileReference": "virtual:tdc-FroHnY",
                  "styles": "export default ({color, heights} = {}) => \`\`",
                },
                "UvbZZuJVSa" => {
                  "fileReference": "virtual:tdc-UvbZZuJVSa",
                  "styles": "export default ({color, heights} = {}) => \`\`",
                },
                "DFutYsdTuNsmYdtaFQU" => {
                  "fileReference": "virtual:tdc-DFutYsdTuNsmYdtaFQU",
                  "styles": "export default ({color, heights} = {}) => \`\`",
                },
                "fNzbMeyhNLtAQkweV" => {
                  "fileReference": "virtual:tdc-fNzbMeyhNLtAQkweV",
                  "styles": "import JKrxYXcMMiKWKoSyxwXensXhaNvzKfACk from \\"virtual:tdc-JKrxYXcMMiKWKoSyxwXensXhaNvzKfACk\\";

              export default {
                  b0as: JKrxYXcMMiKWKoSyxwXensXhaNvzKfACk
              };",
                },
                "JKrxYXcMMiKWKoSyxwXensXhaNvzKfACk" => {
                  "fileReference": "virtual:tdc-JKrxYXcMMiKWKoSyxwXensXhaNvzKfACk",
                  "styles": "export default ({} = {}) => \`\`",
                },
                "FroGui" => {
                  "fileReference": "virtual:tdc-FroGui",
                  "styles": "export default ({} = {}) => \`\`",
                },
                "BFkFG" => {
                  "fileReference": "virtual:tdc-BFkFG",
                  "styles": "import USKtRmcqhVTaNLtGHTvY from \\"virtual:tdc-USKtRmcqhVTaNLtGHTvY\\";

              export default {
                  b0as: USKtRmcqhVTaNLtGHTvY
              };",
                },
                "USKtRmcqhVTaNLtGHTvY" => {
                  "fileReference": "virtual:tdc-USKtRmcqhVTaNLtGHTvY",
                  "styles": "export default ({} = {}) => \`\`",
                },
              }
            `);
        });
    });
});

describe("resolveComponentName", () => {
    test("no match", () => {
        const noMatches = [
            `${shortLibraryName}`,
            ` ${shortLibraryName}`,
            ` ${shortLibraryName}-`,
            `button-component`,
            `${shortLibraryName}-button-`,
            `${shortLibraryName}-button-comp1`,
            `${shortLibraryName}c-button-comp1`,
        ];
        expect(
            noMatches
                .map(s => resolveComponentName(s, "-"))
                .filter(r => r !== undefined)
        ).toEqual([]);
    });
    test("match", () => {
        const matches = [
            `${shortLibraryName}-button`,
            `${shortLibraryName}-button-icon`,
        ];
        expect(matches.map(s => resolveComponentName(s, "-"))).toEqual([
            "TdcButton",
            "TdcButtonIcon",
        ]);
    });
});

const reg1 = new Registration({
    identifier: "icon",
    props: {},
    styles: () => ({}),
    dependencies: {},
    mappings: {},
    importPath: "",
});
const reg2 = new Registration({
    identifier: "button",
    props: {},
    styles: () => ({}),
    dependencies: {
        icon: reg1,
    },
    mappings: {
        icon: {},
    },
    importPath: "",
});

describe("findMatchingRegistrations", () => {
    test("simple match", () => {
        expect(findMatchingRegistrations("icon", [reg1], "-")).toEqual(reg1);
    });
    test("simple non-match", () => {
        expect(findMatchingRegistrations("tdc-icon", [reg1], "-"))
            .toBeUndefined;
    });
    test("nested match", () => {
        expect(findMatchingRegistrations("button-icon", [reg2], "-")).toEqual(
            reg1
        );
    });
    test("nested non-match", () => {
        expect(findMatchingRegistrations("button-icon-atom", [reg2], "-"))
            .toBeUndefined;
        expect(findMatchingRegistrations("icon", [reg2], "-")).toBeUndefined;
    });
});

describe("analyze", () => {
    const mockedReg1 = {
        identifier: "icon",
        compile: () => ({
            styles: {
                some: "",
                compiled: "",
                props: ["a", "b"],
            },
            children: {},
        }),
        importPath: "@frontline-hq/tailwind-dynamic-components/Icon",
    } as unknown as Registration;
    const mockedReg2 = {
        identifier: "button",
        dependencies: {
            icon: {
                ...mockedReg1,
                importPath:
                    "@frontline-hq/tailwind-dynamic-components/Button/Icon",
            },
        },
        compile: () => ({
            styles: {
                some: "",
                other: "",
                compiled: "",
                props: ["c", "d"],
            },
            children: {
                icon: mockedReg1.compile({}),
            },
        }),
        importPath: "@frontline-hq/tailwind-dynamic-components/Button",
    } as unknown as Registration;
    test("simple", async () => {
        const analysisResult = await analyze(
            dedent`
				<div></div>
				<tdc-icon tdc={{some: "", test: "", obj: ["", ""]}}>
					<h1>Hey there</h1>
				</tdc-icon>
			`,
            [mockedReg1],
            "-"
        );
        expect(analysisResult.elementsToReplace).toMatchInlineSnapshot(`
          [
            {
              "end": 96,
              "start": 12,
              "transformed": "<TdcIcon tdc={{\\"styles\\":{\\"some\\":\\"\\",\\"compiled\\":\\"\\",\\"props\\":[\\"a\\",\\"b\\"]},\\"children\\":{}}}>
          	<h1>Hey there</h1>
          </TdcIcon>",
            },
          ]
        `);
        expect(analysisResult.importsToAdd).toEqual(
            new Map([
                ["TdcIcon", "@frontline-hq/tailwind-dynamic-components/Icon"],
            ])
        );
        expect(analysisResult.safelist).toEqual(["", "a", "b"]);
    });
    test("nested", async () => {
        const analysisResult = await analyze(
            dedent`
				<div></div>
				<tdc-button tdc={{some: "", test: "", obj: ["", ""]}}>
					<tdc-button-icon  tdc={{some: "", test: "", obj: ["", ""]}}>
						<h2>Whats up</h2>
					</tdc-button-icon>
					<h1>Hey there</h1>
				</tdc-button>
			`,
            [mockedReg2],
            "-"
        );
        expect(analysisResult.elementsToReplace).toMatchInlineSnapshot(`
          [
            {
              "end": 202,
              "start": 12,
              "transformed": "<TdcButton tdc={{\\"styles\\":{\\"some\\":\\"\\",\\"other\\":\\"\\",\\"compiled\\":\\"\\",\\"props\\":[\\"c\\",\\"d\\"]},\\"children\\":{\\"icon\\":{\\"styles\\":{\\"some\\":\\"\\",\\"compiled\\":\\"\\",\\"props\\":[\\"a\\",\\"b\\"]},\\"children\\":{}}}}}>
          	<tdc-button-icon  tdc={{some: \\"\\", test: \\"\\", obj: [\\"\\", \\"\\"]}}>
          		<h2>Whats up</h2>
          	</tdc-button-icon>
          	<h1>Hey there</h1>
          </TdcButton>",
            },
            {
              "end": 168,
              "start": 68,
              "transformed": "<TdcButtonIcon  tdc={{\\"styles\\":{\\"some\\":\\"\\",\\"compiled\\":\\"\\",\\"props\\":[\\"a\\",\\"b\\"]},\\"children\\":{}}}>
          		<h2>Whats up</h2>
          	</TdcButtonIcon>",
            },
          ]
        `);
        expect(analysisResult.importsToAdd).toEqual(
            new Map([
                [
                    "TdcButton",
                    "@frontline-hq/tailwind-dynamic-components/Button",
                ],
                [
                    "TdcButtonIcon",
                    "@frontline-hq/tailwind-dynamic-components/Button/Icon",
                ],
            ])
        );
        expect(analysisResult.safelist).toEqual(["", "c", "d", "a", "b"]);
    });
});
