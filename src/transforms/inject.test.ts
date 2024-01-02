import { describe, test, expect } from "vitest";
import { newEmittedFiles, analyzeJsSvelte } from "./inject";
import { parse as jsParse } from "recast";
import { walk } from "estree-walker";
import { parse as svelteParse, walk as svelteWalk } from "svelte/compiler";
import { CompoundStyles, Styles } from "../register";

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

describe("analyze", () => {
    describe("js", () => {
        test("elements to replace", () => {
            expect(
                analyzeJsSvelte(
                    jsAst,
                    [styles3, compoundStyle],
                    newEmittedFiles(),
                    walk
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
            test("registrations with missing sub style from compoundStyle", () => {
                expect(
                    analyzeJsSvelte(
                        jsAst,
                        [styles3, compoundStyle],
                        newEmittedFiles(),
                        walk
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
            test("registrations with sub style from compoundStyle", () => {
                expect(
                    analyzeJsSvelte(
                        jsAst,
                        [styles3, compoundStyle],
                        newEmittedFiles(),
                        walk
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
        test("emitted files", () => {
            expect(
                analyzeJsSvelte(
                    jsAst,
                    [styles3, compoundStyle],
                    newEmittedFiles(),
                    walk
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
        test("elements to replace", () => {
            expect(
                analyzeJsSvelte(
                    svelteAst,
                    [styles3, compoundStyle],
                    newEmittedFiles(),
                    svelteWalk
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
            test("registrations with missing sub style from compoundStyle", () => {
                expect(
                    analyzeJsSvelte(
                        svelteAst,
                        [styles3, compoundStyle],
                        newEmittedFiles(),
                        svelteWalk
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
            test("registrations with sub style from compoundStyle", () => {
                expect(
                    analyzeJsSvelte(
                        svelteAst,
                        [styles3, compoundStyle],
                        newEmittedFiles(),
                        svelteWalk
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
        test("emitted files", () => {
            expect(
                analyzeJsSvelte(
                    svelteAst,
                    [styles3, compoundStyle],
                    newEmittedFiles(),
                    svelteWalk
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
