import { describe, expect, test } from "vitest";
import { TransformConfig, getTransformConfig } from "./config";
import { styles3 } from "./transforms/inject.test";

export async function getSampleConfig01() {
    return {
        ...(await getTransformConfig()),
        library: {
            debug: false,
            registrations: [styles3],
        },
    } as TransformConfig;
}

describe("properties", async () => {
    const sampleConfig01 = await getSampleConfig01();
    test("debug", () => {
        expect(sampleConfig01.debug).toEqual(false);
    });
    test("library", () => {
        expect(sampleConfig01.library).toEqual({
            debug: false,
            registrations: [styles3],
        });
    });
});
