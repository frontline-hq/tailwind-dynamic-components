import { describe, test, expect } from "vitest";
import {
    findMatchingRegistrations,
    resolveComponentName,
    analyze,
} from "./inject";
import { Registration } from "../register";
import { shortLibraryName } from "../library.config";
import dedent from "ts-dedent";

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
