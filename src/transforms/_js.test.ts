import { describe, test, expect } from "vitest";
import { transformJs } from "./_.js";
import { jsTestCode01 } from "./inject.test";
import { newEmittedFiles } from "./inject";
import { TransformConfig, getTransformConfig } from "../config/config.js";
import merge from "lodash.merge";
import { CompoundStyles, Styles } from "../register.js";

const emitted01 = newEmittedFiles();

describe("process js", async () => {
    const result = await transformJs(
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
                    new CompoundStyles("b0s", {}).addInline("b0as"),
                ],
            },
        }) as TransformConfig,
        jsTestCode01,
        emitted01
    );
    test("simple transform", () => {
        expect(result.code).toMatchInlineSnapshot(`
          "import BFkFG from \\"virtual:tdc-BFkFG\\";
          import FroGui from \\"virtual:tdc-FroGui\\";
          import DFutYsdTuNsmYdtaFQU from \\"virtual:tdc-DFutYsdTuNsmYdtaFQU\\";
          import UvbZZuJVSa_ from \\"virtual:tdc-UvbZZuJVSa\\";
          import FroHnY from \\"virtual:tdc-FroHnY\\";

              // Match
              const a = FroHnY;
              const b = UvbZZuJVSa_;
              const c = DFutYsdTuNsmYdtaFQU;
              const f = FroGui;
              const g = BFkFG;
              // identifier of md:b0is is reserved
              const UvbZZuJVSa = \\"something\\";
              // Do not match
              const d = \`hover:md:\${a}\`;
              "
        `);
    });
});
