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
            new Map([["TdcIcon", "@frontline-hq/tdc/Icon"]])
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
                ["TdcButton", "@frontline-hq/tdc/Button"],
                ["TdcButtonIcon", "@frontline-hq/tdc/Button/Icon"],
            ])
        );
        expect(analysisResult.safelist).toEqual(["", "c", "d", "a", "b"]);
    });
});
