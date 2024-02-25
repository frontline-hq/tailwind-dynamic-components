import { describe, test, expect } from "vitest";
import { analyze } from "./inject";
import { Registration } from "../register";
import dedent from "ts-dedent";

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
        importPath: "@frontline-hq/tdc/Icon",
    } as unknown as Registration;
    const mockedReg2 = {
        identifier: "button",
        dependencies: {
            icon: {
                ...mockedReg1,
                importPath: "@frontline-hq/tdc/Button/Icon",
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
        importPath: "@frontline-hq/tdc/Button",
    } as unknown as Registration;
    describe("simple", async () => {
        test("static compile", async () => {
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
                  "end": 62,
                  "start": 27,
                  "transformed": "{\\"styles\\":{\\"some\\":\\"\\",\\"compiled\\":\\"\\",\\"props\\":[\\"a\\",\\"b\\"]},\\"children\\":{}}",
                },
                {
                  "end": 21,
                  "start": 12,
                  "transformed": "<TdcIcon",
                },
                {
                  "end": 98,
                  "start": 88,
                  "transformed": "</TdcIcon",
                },
              ]
            `);
            expect(analysisResult.importsToAdd).toEqual(
                new Map([["TdcIcon", "@frontline-hq/tdc/Icon"]])
            );
        });
        test("runtime compile", async () => {
            const analysisResult = await analyze(
                dedent`
                    <script>
                        const some = "value"
                    </script>
                    <div></div>
                    <tdc-icon tdc={{some, test: "", obj: ["", ""]}}>
                        <h1>Hey there</h1>
                    </tdc-icon>
                `,
                [mockedReg1],
                "-"
            );
            expect(analysisResult.elementsToReplace).toMatchInlineSnapshot(`
              [
                {
                  "end": 102,
                  "start": 71,
                  "transformed": "tdcConfig.registrations[\\"0\\"].compile({some, test: \\"\\", obj: [\\"\\", \\"\\"]}, \`{some, test: \\"\\", obj: [\\"\\", \\"\\"]}\`)",
                },
                {
                  "end": 65,
                  "start": 56,
                  "transformed": "<TdcIcon",
                },
                {
                  "end": 138,
                  "start": 128,
                  "transformed": "</TdcIcon",
                },
              ]
            `);
            expect(analysisResult.importsToAdd).toEqual(
                new Map([
                    ["TdcIcon", "@frontline-hq/tdc/Icon"],
                    [
                        "default as tdcConfig",
                        "/Users/benjaminpreiss/Documents/work/tailwind-dynamic-components/tdc.config.ts",
                    ],
                ])
            );
        });
    });
    describe("nested", async () => {
        test("static compile", async () => {
            const analysisResult = await analyze(
                dedent`
                    <div></div>
                    <tdc-button tdc={{some: "", test: "", obj: ["", ""]}}>
                        <tdc-button-icon tdc={{some: "", test: "", obj: ["", ""]}}>
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
                  "end": 64,
                  "start": 29,
                  "transformed": "{\\"styles\\":{\\"some\\":\\"\\",\\"other\\":\\"\\",\\"compiled\\":\\"\\",\\"props\\":[\\"c\\",\\"d\\"]},\\"children\\":{\\"icon\\":{\\"styles\\":{\\"some\\":\\"\\",\\"compiled\\":\\"\\",\\"props\\":[\\"a\\",\\"b\\"]},\\"children\\":{}}}}",
                },
                {
                  "end": 23,
                  "start": 12,
                  "transformed": "<TdcButton",
                },
                {
                  "end": 215,
                  "start": 203,
                  "transformed": "</TdcButton",
                },
                {
                  "end": 128,
                  "start": 93,
                  "transformed": "{\\"styles\\":{\\"some\\":\\"\\",\\"compiled\\":\\"\\",\\"props\\":[\\"a\\",\\"b\\"]},\\"children\\":{}}",
                },
                {
                  "end": 87,
                  "start": 71,
                  "transformed": "<TdcButtonIcon",
                },
                {
                  "end": 178,
                  "start": 161,
                  "transformed": "</TdcButtonIcon",
                },
              ]
            `);
            expect(analysisResult.importsToAdd).toEqual(
                new Map([
                    ["TdcButton", "@frontline-hq/tdc/Button"],
                    ["TdcButtonIcon", "@frontline-hq/tdc/Button/Icon"],
                ])
            );
        });
    });
});
