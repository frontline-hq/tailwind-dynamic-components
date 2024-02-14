import { shortLibraryName } from "./library.config";
import {
    evalStringToParameterVariants,
    findMatchingRegistrations,
    getPropPermutations,
    resolveComponentName,
} from "./utils";
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
        expect(findMatchingRegistrations("icon", [reg1], "-")).toEqual({
            path: [0],
            registration: reg1,
        });
    });
    test("simple non-match", () => {
        expect(findMatchingRegistrations("tdc-icon", [reg1], "-"))
            .toBeUndefined;
    });
    test("nested match", () => {
        expect(findMatchingRegistrations("button-icon", [reg2], "-")).toEqual({
            path: [0, "dependencies", 0],
            registration: reg1,
        });
    });
    test("nested non-match", () => {
        expect(findMatchingRegistrations("button-icon-atom", [reg2], "-"))
            .toBeUndefined;
        expect(findMatchingRegistrations("icon", [reg2], "-")).toBeUndefined;
    });
});
describe("getPropPermutations", () => {
    test("empty object", () => {
        expect(getPropPermutations({})).toEqual([]);
    });
    describe("single prop", () => {
        test("array", () => {
            expect(getPropPermutations({ color: ["blue", "green"] })).toEqual([
                { color: "blue" },
                { color: "green" },
            ]);
        });
        test("object", () => {
            expect(
                getPropPermutations({
                    color: {
                        default: ["blue", "green"],
                        md: ["blue", "green"],
                    },
                })
            ).toEqual([
                {
                    color: {
                        default: "blue",
                        md: "blue",
                    },
                },
                {
                    color: {
                        default: "blue",
                        md: "green",
                    },
                },
                {
                    color: {
                        default: "green",
                        md: "blue",
                    },
                },
                {
                    color: {
                        default: "green",
                        md: "green",
                    },
                },
            ]);
        });
    });
    describe("multiple props", () => {
        test("array only", () => {
            expect(
                getPropPermutations({
                    color: ["blue", "green"],
                    destructive: ["true", "false"],
                    size: ["sm", "md"],
                })
            ).toEqual([
                {
                    color: "blue",
                    destructive: "true",
                    size: "sm",
                },
                {
                    color: "blue",
                    destructive: "true",
                    size: "md",
                },
                {
                    color: "blue",
                    destructive: "false",
                    size: "sm",
                },
                {
                    color: "blue",
                    destructive: "false",
                    size: "md",
                },
                {
                    color: "green",
                    destructive: "true",
                    size: "sm",
                },
                {
                    color: "green",
                    destructive: "true",
                    size: "md",
                },
                {
                    color: "green",
                    destructive: "false",
                    size: "sm",
                },
                {
                    color: "green",
                    destructive: "false",
                    size: "md",
                },
            ]);
        });

        test("array and object", () => {
            expect(
                getPropPermutations({
                    color: ["blue", "green"],
                    destructive: ["true", "false"],
                    size: { default: ["sm", "md"], md: ["sm", "md"] },
                })
            ).toEqual([
                {
                    color: "blue",
                    destructive: "true",
                    size: {
                        default: "sm",
                        md: "sm",
                    },
                },
                {
                    color: "blue",
                    destructive: "true",
                    size: {
                        default: "sm",
                        md: "md",
                    },
                },
                {
                    color: "blue",
                    destructive: "true",
                    size: {
                        default: "md",
                        md: "sm",
                    },
                },
                {
                    color: "blue",
                    destructive: "true",
                    size: {
                        default: "md",
                        md: "md",
                    },
                },
                {
                    color: "blue",
                    destructive: "false",
                    size: {
                        default: "sm",
                        md: "sm",
                    },
                },
                {
                    color: "blue",
                    destructive: "false",
                    size: {
                        default: "sm",
                        md: "md",
                    },
                },
                {
                    color: "blue",
                    destructive: "false",
                    size: {
                        default: "md",
                        md: "sm",
                    },
                },
                {
                    color: "blue",
                    destructive: "false",
                    size: {
                        default: "md",
                        md: "md",
                    },
                },
                {
                    color: "green",
                    destructive: "true",
                    size: {
                        default: "sm",
                        md: "sm",
                    },
                },
                {
                    color: "green",
                    destructive: "true",
                    size: {
                        default: "sm",
                        md: "md",
                    },
                },
                {
                    color: "green",
                    destructive: "true",
                    size: {
                        default: "md",
                        md: "sm",
                    },
                },
                {
                    color: "green",
                    destructive: "true",
                    size: {
                        default: "md",
                        md: "md",
                    },
                },
                {
                    color: "green",
                    destructive: "false",
                    size: {
                        default: "sm",
                        md: "sm",
                    },
                },
                {
                    color: "green",
                    destructive: "false",
                    size: {
                        default: "sm",
                        md: "md",
                    },
                },
                {
                    color: "green",
                    destructive: "false",
                    size: {
                        default: "md",
                        md: "sm",
                    },
                },
                {
                    color: "green",
                    destructive: "false",
                    size: {
                        default: "md",
                        md: "md",
                    },
                },
            ]);
        });
    });
});

describe("evalStringToParameterVariants", () => {
    describe("errors", () => {
        test("Props need to be wrapped in {}", () => {
            expect(() =>
                evalStringToParameterVariants("''", {
                    size: ["sm", "md"],
                })
            ).toThrowErrorMatchingInlineSnapshot(
                '"You need to wrap tdc props in {}."'
            );
            expect(() =>
                evalStringToParameterVariants("() => {}", {
                    size: ["sm", "md"],
                })
            ).toThrowErrorMatchingInlineSnapshot(
                '"You need to wrap tdc props in {}."'
            );
        });
        test("Key not in registered props", () => {
            expect(() =>
                evalStringToParameterVariants("{color: 'blue'}", {
                    size: ["sm", "md"],
                })
            ).toThrowErrorMatchingInlineSnapshot(
                '"Registered props in tdc do not contain key color"'
            );
        });
        test("Value not in registered props", () => {
            expect(() =>
                evalStringToParameterVariants("{size: 'lg'}", {
                    size: ["sm", "md"],
                })
            ).toThrowErrorMatchingInlineSnapshot(
                '"Value of prop in tdc is not amongst the registered values."'
            );
        });
    });
    describe("Single props", () => {
        describe("Optimal", () => {
            test("Simple", () => {
                expect(
                    evalStringToParameterVariants("{size: 'sm'}", {
                        size: ["sm", "md"],
                    })
                ).toEqual({
                    parameterVariants: {
                        size: ["sm"],
                    },
                    type: "optimal",
                });
            });
            test("Modifier", () => {
                expect(
                    evalStringToParameterVariants(
                        "{size: {default: 'sm', lg: 'md'}}",
                        {
                            size: ["sm", "md"],
                        }
                    )
                ).toEqual({
                    parameterVariants: {
                        size: {
                            default: ["sm"],
                            lg: ["md"],
                        },
                    },
                    type: "optimal",
                });
            });
        });
        describe("Not optimal", () => {
            test("Simple", () => {
                expect(
                    evalStringToParameterVariants("{size: size}", {
                        size: ["sm", "md"],
                    })
                ).toEqual({
                    parameterVariants: {
                        size: ["sm", "md"],
                    },
                    type: "not-optimal",
                });
                expect(
                    evalStringToParameterVariants("{size: () => {}}", {
                        size: ["sm", "md"],
                    })
                ).toEqual({
                    parameterVariants: {
                        size: ["sm", "md"],
                    },
                    type: "not-optimal",
                });
            });
            test("Modifier", () => {
                expect(
                    evalStringToParameterVariants(
                        "{size: {default: size, lg: someOtherSize}}",
                        {
                            size: ["sm", "md"],
                        }
                    )
                ).toEqual({
                    parameterVariants: {
                        size: {
                            default: ["sm", "md"],
                            lg: ["sm", "md"],
                        },
                    },
                    type: "not-optimal",
                });
                expect(
                    evalStringToParameterVariants(
                        "{size: {default: {}, lg: () => {}}}",
                        {
                            size: ["sm", "md"],
                        }
                    )
                ).toEqual({
                    parameterVariants: {
                        size: {
                            default: ["sm", "md"],
                            lg: ["sm", "md"],
                        },
                    },
                    type: "not-optimal",
                });
            });
        });
    });
    describe("Multiple props", () => {
        describe("Optimal", () => {
            test("Mixed", () => {
                expect(
                    evalStringToParameterVariants(
                        "{size: {default: 'sm', lg: 'md'}, color: 'red'}",
                        {
                            size: ["sm", "md"],
                            color: ["red", "blue"],
                        }
                    )
                ).toEqual({
                    parameterVariants: {
                        color: ["red"],
                        size: {
                            default: ["sm"],
                            lg: ["md"],
                        },
                    },
                    type: "optimal",
                });
            });
        });
    });
});
