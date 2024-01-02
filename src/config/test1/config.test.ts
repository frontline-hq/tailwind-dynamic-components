import { describe, expect, test, vi } from "vitest";
import { findConfigFileFolder } from "../config";
import path from "path";

describe("config", () => {
    describe("findConfigFileFolder 1", () => {
        test("child directory of cwd", async () => {
            vi.mock("process", () => ({
                cwd: () => path.join(__dirname, "..", ".."),
            }));
            expect(await findConfigFileFolder(__dirname)).toMatch(
                new RegExp("/src/config/test1$", "g")
            );
        });
    });
});
