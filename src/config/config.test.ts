import { describe, expect, test } from "vitest";
import { TransformConfig, getTransformConfig } from "./config";
import { styles1 } from "../register.test";
import merge from "lodash.merge";
import { Styles } from "../register";

describe("config", () => {
    describe("properties", () => {
        test("debug", async () => {
            expect(
                (
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
                            ],
                        },
                    }) as TransformConfig
                ).debug
            ).toEqual(true);
        });
    });

    describe("getTransformConfig", () => {
        test("cwdFolderPath", async () =>
            expect((await getTransformConfig()).cwdFolderPath).toEqual(
                process.cwd()
            ));
        test("debug", async () =>
            expect((await getTransformConfig(__dirname)).debug).toEqual(true));
        test("library.debug", async () =>
            expect((await getTransformConfig(__dirname)).library.debug).toEqual(
                true
            ));
        test("library.registrations", async () =>
            expect(
                (await getTransformConfig(__dirname)).library.registrations
            ).toEqual([styles1]));
    });
});
