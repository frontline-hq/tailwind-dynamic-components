import { shortLibraryName } from "./library.config";
import { findMatchingRegistrations, resolveComponentName } from "./utils";
import { describe, test, expect } from "vitest";
import { Registration } from "./register";

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
