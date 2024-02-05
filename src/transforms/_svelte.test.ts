import { describe, test, expect } from "vitest";
import { transformSvelte } from "./_.svelte";
import { getTransformConfig } from "../config/config";

describe("process svelte", async () => {
    const result = await transformSvelte(
        await getTransformConfig(__dirname),
        `
<tdc-icon tdc={{some: "", obj: ""}}>
    <div></div>
</tdc-icon>
`
    );
    test("simple transform", () => {
        expect(result.code).toMatchInlineSnapshot(`
          "<script>import {TdcIcon} from \\"some-import-path\\";
          </script>
          <TdcIcon tdc={{\\"result\\":\\"\\"}}>
              <div></div>
          </TdcIcon>
          "
        `);
    });
});
