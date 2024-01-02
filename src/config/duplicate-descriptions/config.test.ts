import { describe, expect, test } from "vitest";
import { getTransformConfig } from "../config";

describe("config", () => {
    describe("getTransformConfig", () => {
        test("duplicate descriptions", () => {
            expect(getTransformConfig(__dirname)).rejects.toEqual(
                new Error("Found duplicate registration some-description.")
            );
        });
    });
});
