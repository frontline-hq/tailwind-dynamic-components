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

describe("config", () => {
    describe("properties", () => {
        test("debug", async () => {
            expect((await getTransformConfig(__dirname)).debug).toEqual(true);
        });
    });
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

describe("getTransformConfig", () => {
    test("cwdFolderPath", async () =>
        expect((await getTransformConfig(process.cwd())).cwdFolderPath).toEqual(
            process.cwd()
        ));
    test("debug", async () =>
        expect((await getTransformConfig()).debug).toEqual(true));
    test("library.debug", async () =>
        expect((await getTransformConfig()).library.debug).toEqual(true));
    test("library.registrations", async () =>
        expect((await getTransformConfig()).library.registrations).toEqual([
            nakedRegistration,
        ]));
});
