import { describe, expect, test } from "vitest";
import { flattenAndCheckRegistrations, getTransformConfig } from "./config";
import { styles1 } from "../register.test";
import { CompoundStyles, Styles } from "../register";

describe("config", () => {
    describe("properties", () => {
        test("debug", async () => {
            expect(
                (
                    await getTransformConfig(
                        {
                            debug: true,
                            registrations: [
                                new Styles("b0is", {
                                    dependencies: {
                                        color: ["blue", "gray"],
                                        heights: ["one", "two"],
                                    },
                                }),
                            ],
                        },
                        __dirname
                    )
                ).debug
            ).toEqual(true);
        });
    });

    describe("flattenAndCheckRegistrations", () => {
        test("01", () => {
            expect(
                flattenAndCheckRegistrations([
                    new Styles("b0is", {
                        dependencies: {
                            color: ["blue", "gray"],
                            heights: ["one", "two"],
                        },
                    }),
                    new CompoundStyles("b0s", {}).addInline("b0as"),
                ])
            ).toMatchInlineSnapshot(`
              [
                Styles {
                  "d": [Function],
                  "dependencies": {
                    "color": [
                      "blue",
                      "gray",
                    ],
                    "heights": [
                      "one",
                      "two",
                    ],
                  },
                  "description": "b0is",
                  "descriptionRegex": /\\(\\?<=\\^\\(\\[\\^\\\\t\\\\n\\\\r\\\\s:\\]\\+:\\)\\*\\)b0is\\$/g,
                  "getV": [Function],
                  "identifierAlphabet": "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
                  "literalEncoding": "utf8",
                  "matchDescription": [Function],
                  "matchModifiers": [Function],
                  "matchVariant": [Function],
                  "modifiersRegex": /\\^\\(\\[\\^\\\\t\\\\n\\\\r\\\\s:\\]\\+:\\)\\+\\(\\?=b0is\\$\\)/g,
                  "propType": [
                    [Function],
                  ],
                  "styles": [
                    [],
                    [],
                  ],
                  "variants": [],
                  "variantsRegex": /\\^\\$/g,
                },
                CompoundStyles {
                  "add": [Function],
                  "addInline": [Function],
                  "description": "b0s",
                  "descriptionRegex": /\\(\\?<=\\^\\(\\[\\^\\\\t\\\\n\\\\r\\\\s:\\]\\+:\\)\\*\\)b0s\\$/g,
                  "identifierAlphabet": "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
                  "literalEncoding": "utf8",
                  "matchDescription": [Function],
                  "matchModifiers": [Function],
                  "matchVariant": [Function],
                  "modifiersRegex": /\\^\\(\\[\\^\\\\t\\\\n\\\\r\\\\s:\\]\\+:\\)\\+\\(\\?=b0s\\$\\)/g,
                  "propType": [
                    {},
                  ],
                  "styles": {
                    "b0as": Styles {
                      "d": [Function],
                      "dependencies": {},
                      "description": "b0as",
                      "descriptionRegex": /\\(\\?<=\\^\\(\\[\\^\\\\t\\\\n\\\\r\\\\s:\\]\\+:\\)\\*\\)b0as\\$/g,
                      "getV": [Function],
                      "identifierAlphabet": "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
                      "literalEncoding": "utf8",
                      "matchDescription": [Function],
                      "matchModifiers": [Function],
                      "matchVariant": [Function],
                      "modifiersRegex": /\\^\\(\\[\\^\\\\t\\\\n\\\\r\\\\s:\\]\\+:\\)\\+\\(\\?=b0as\\$\\)/g,
                      "propType": [
                        [Function],
                      ],
                      "styles": [
                        [],
                        [],
                      ],
                      "variants": [],
                      "variantsRegex": /\\^\\$/g,
                    },
                  },
                  "variants": [],
                  "variantsRegex": /\\^\\$/g,
                },
                Styles {
                  "d": [Function],
                  "dependencies": {},
                  "description": "b0as",
                  "descriptionRegex": /\\(\\?<=\\^\\(\\[\\^\\\\t\\\\n\\\\r\\\\s:\\]\\+:\\)\\*\\)b0as\\$/g,
                  "getV": [Function],
                  "identifierAlphabet": "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
                  "literalEncoding": "utf8",
                  "matchDescription": [Function],
                  "matchModifiers": [Function],
                  "matchVariant": [Function],
                  "modifiersRegex": /\\^\\(\\[\\^\\\\t\\\\n\\\\r\\\\s:\\]\\+:\\)\\+\\(\\?=b0as\\$\\)/g,
                  "propType": [
                    [Function],
                  ],
                  "styles": [
                    [],
                    [],
                  ],
                  "variants": [],
                  "variantsRegex": /\\^\\$/g,
                },
              ]
            `);
        });
    });

    describe("getTransformConfig", () => {
        test("cwdFolderPath", async () =>
            expect(
                (
                    await getTransformConfig(
                        { debug: false, registrations: [] },
                        process.cwd()
                    )
                ).cwdFolderPath
            ).toEqual(process.cwd()));
        test("debug", async () =>
            expect(
                (await getTransformConfig({ debug: true, registrations: [] }))
                    .debug
            ).toEqual(true));
        test("library.debug", async () =>
            expect(
                (await getTransformConfig({ debug: true, registrations: [] }))
                    .library.debug
            ).toEqual(true));
        test("library.registrations", async () =>
            expect(
                (
                    await getTransformConfig({
                        debug: true,
                        registrations: [styles1],
                    })
                ).library.registrations
            ).toEqual([styles1]));
    });
});
