import { describe, expect, test } from "vitest";
import { checkRegistrations, getTransformConfig } from "./config";
import { Registration } from "../register";

const nakedRegistration = new Registration({
    identifier: "icon",
    props: {},
    styles: () => ({}),
    dependencies: {},
    mappings: {},
    importPath: "",
});

describe("checkRegistrations", () => {
    test("throw on duplicates", () => {
        expect(() =>
            checkRegistrations([nakedRegistration, nakedRegistration])
        ).toThrowError("Found duplicate registration icon.");
    });
    test("throw on nested duplicates", () => {
        expect(() =>
            checkRegistrations([
                new Registration({
                    identifier: "icon",
                    props: {},
                    styles: () => ({}),
                    dependencies: {
                        icon1: new Registration({
                            identifier: "iconChild",
                            props: {},
                            styles: () => ({}),
                            dependencies: {},
                            mappings: {},
                            importPath: "",
                        }),
                        icon2: new Registration({
                            identifier: "iconChild",
                            props: {},
                            styles: () => ({}),
                            dependencies: {},
                            mappings: {},
                            importPath: "",
                        }),
                    },
                    mappings: {
                        icon1: {},
                        icon2: {},
                    },
                    importPath: "",
                }),
            ])
        ).toThrowError("Found duplicate registration iconChild.");
    });
});
