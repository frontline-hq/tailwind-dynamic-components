import { describe, vi, test, expect } from "vitest";
import { transformJs } from "./_.js";
import { getSampleConfig01 } from "../config.test";
import { jsTestCode01 } from "./inject.test";
import { newEmittedFiles } from "./inject";
import { EmitFile, EmittedChunk, PluginContext } from "rollup";

const emitted01 = newEmittedFiles();
const emitFileSpy = vi.fn(({ id }: EmittedChunk) => "ref-" + id) as EmitFile;
const getFileNameSpy = vi.fn(
    (ref: string) => "./some/file/name/" + ref
) as PluginContext["getFileName"];

describe("process js", async () => {
    const result = await transformJs(
        await getSampleConfig01(),
        jsTestCode01,
        emitted01,
        {
            emitFile: emitFileSpy,
            getFileName: getFileNameSpy,
        } as PluginContext
    );
    test("simple transform", () => {
        expect(result.code).toMatchInlineSnapshot(`
"import DFutYsdTuNsmYdtaFQU from \\"./some/file/name/ref-tdc-DFutYsdTuNsmYdtaFQU\\";
import UvbZZuJVSa_ from \\"./some/file/name/ref-tdc-UvbZZuJVSa\\";
import FroHnY from \\"./some/file/name/ref-tdc-FroHnY\\";

    // Match
    const a = FroHnY;
    const b = UvbZZuJVSa_;
    const c = DFutYsdTuNsmYdtaFQU;
    // identifier of md:b0is is reserved
    const UvbZZuJVSa = \\"something\\";
    // Do not match
    const d = \`hover:md:\${a}\`;
    "`);
    });
});
