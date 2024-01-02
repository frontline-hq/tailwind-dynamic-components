import { describe, test, expect } from "vitest";
import { transformSvelte } from "./_.svelte";
import { svelteTestCode01 } from "./inject.test";
import { newEmittedFiles } from "./inject";
import merge from "lodash.merge";
import { TransformConfig, getTransformConfig } from "../config/config";
import { CompoundStyles, Styles } from "../register";
import dedent from "ts-dedent";

const emitted01 = newEmittedFiles();

describe("process svelte", async () => {
    const result = await transformSvelte(
        merge(await getTransformConfig(__dirname), {
            library: {
                debug: false,
                registrations: [
                    new Styles("b0is", {
                        dependencies: {
                            color: ["blue", "gray"],
                            heights: ["one", "two"],
                        },
                    }),
                    new CompoundStyles("b0s", {}).addInline("b0as"),
                ],
            },
        }) as TransformConfig,
        svelteTestCode01,
        emitted01
    );
    test("simple transform", () => {
        expect(result.code).toMatchInlineSnapshot(`
          "
          <script>import FroHnY from \\"virtual:tdc-FroHnY\\";
          import UvbZZuJVSa_ from \\"virtual:tdc-UvbZZuJVSa\\";
          import DFutYsdTuNsmYdtaFQU from \\"virtual:tdc-DFutYsdTuNsmYdtaFQU\\";
          import fNzbMeyhNLtAQkweV from \\"virtual:tdc-fNzbMeyhNLtAQkweV\\";
          import FroGui from \\"virtual:tdc-FroGui\\";
          import BFkFG from \\"virtual:tdc-BFkFG\\";

              // Match
              const a = FroHnY;
              const b = UvbZZuJVSa_;
              const c = DFutYsdTuNsmYdtaFQU;
              const f = FroGui;
              const g = BFkFG;
              // identifier of md:b0is is reserved
              const UvbZZuJVSa = \\"something\\";
              // Do not match
              const d = \`hover:md:\${a}\`;
              </script>

          <!-- Match -->
          <Component some-prop={FroHnY}/>
          <Component some-prop={UvbZZuJVSa_} />
          <Component some-prop={DFutYsdTuNsmYdtaFQU} />
          <Component some-prop={DFutYsdTuNsmYdtaFQU} />
          <Component some-prop={DFutYsdTuNsmYdtaFQU} />
          <Component some-prop={fNzbMeyhNLtAQkweV} />

          <!-- Do not match -->
          <Component some-prop=\\"ab0is\\" />
          "
        `);
    });

    test("typescript", async () => {
        const result = await transformSvelte(
            merge(await getTransformConfig(__dirname), {
                library: {
                    debug: false,
                    registrations: [
                        new Styles("test01", {
                            variants: ["sm", "md"],
                        }).staticStyles("bg-green-400"),
                    ],
                },
            }) as TransformConfig,
            dedent`
            <script lang="ts" context="module">
                type AnotherTest = string
            </script>
            <script lang="ts">
                    import TestComponent from './TestComponent.svelte';
                    type Test = string
            </script>

            <TestComponent styles="sm_test01" />
            `,
            newEmittedFiles()
        );
        expect(result.code).toMatchInlineSnapshot(`
          "<script lang=\\"ts\\" context=\\"module\\"></script>
          <script lang=\\"ts\\">import MFfACiAdjryJq from \\"virtual:tdc-MFfACiAdjryJq\\";
          import TestComponent from \\"./TestComponent.svelte\\";
          </script>

          <TestComponent styles={MFfACiAdjryJq} />"
        `);
    });

    test("no script tag", async () => {
        const result = await transformSvelte(
            merge(await getTransformConfig(__dirname), {
                library: {
                    debug: false,
                    registrations: [
                        new Styles("test01", {
                            variants: ["sm", "md"],
                        }).staticStyles("bg-green-400"),
                    ],
                },
            }) as TransformConfig,
            dedent`
            <div styles="sm_test01" />
            `,
            newEmittedFiles()
        );
        expect(result.code).toMatchInlineSnapshot(`
          "<script>import MFfACiAdjryJq from \\"virtual:tdc-MFfACiAdjryJq\\";
          </script><div styles={MFfACiAdjryJq} />"
        `);
    });
});
