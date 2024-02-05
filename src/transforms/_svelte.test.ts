import { describe, test, expect } from "vitest";
import { transformSvelte } from "./_.svelte";
import { getTransformConfig } from "../config/config";

describe("process svelte", async () => {
    const result = await transformSvelte(
        await getTransformConfig(
            {
                debug: false,
                registrations: [
                    {
                        identifier: "icon",
                        compile: () => ({ result: "" }),
                        importPath: "some-import-path",
                        dependencies: {},
                    },
                ],
                tagNameDelimiter: "-",
            },
            __dirname
        ),
        `
<tdc-icon tdc={{some: "", obj: ""}}>
    <div></div>
</tdc-icon>
`
    );
    test("simple transform", () => {
        expect(result.code).toMatchInlineSnapshot(`
          "<script>import {TdcIcon} from \\"some-import-path\\";
          </script>
          <TdcIcon tdc={{\\"result\\":\\"\\"}}>
              <div></div>
          </TdcIcon>
          "
        `);
    });

    /* test("typescript", async () => {
        const result = await transformSvelte(
            await getTransformConfig(
                {
                    debug: false,
                    registrations: [
                        new Styles("test01", {
                            variants: ["sm", "md"],
                        }).staticStyles("bg-green-400"),
                    ],
                },
                __dirname
            ),
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
            await getTransformConfig(
                {
                    debug: false,
                    registrations: [
                        new Styles("test01", {
                            variants: ["sm", "md"],
                        }).staticStyles("bg-green-400"),
                    ],
                },
                __dirname
            ),
            dedent`
            <div styles="sm_test01" />
            `,
            newEmittedFiles()
        );
        expect(result.code).toMatchInlineSnapshot(`
          "<script>import MFfACiAdjryJq from \\"virtual:tdc-MFfACiAdjryJq\\";
          </script><div styles={MFfACiAdjryJq} />"
        `);
    }); */
});
