import { describe, test, expect } from "vitest";
import { transformSvelte } from "./_.svelte";
import type { TransformConfig } from "../config/config";
import { Registration } from "../register";

const mockedReg1 = {
    identifier: "icon",
    compile: () => ({
        styles: {},
        children: {},
    }),
    importPath: "@frontline-hq/tdc/Icon",
} as unknown as Registration;

const mockedReg2 = {
    identifier: "wrapper",
    compile: () => ({
        styles: {},
        children: {},
    }),
    importPath: "@frontline-hq/tdc/Wrapper",
} as unknown as Registration;

const getMockedConfig = (registrations: Registration[]) =>
    ({
        cwdFolderPath: "",
        library: {
            registrations,
            tagNameDelimiter: "-",
            debug: false,
            tailwindConfigPath: "",
        },
        usesTypeScript: true,
    }) as TransformConfig;

describe("process svelte", () => {
    test("simple transform", async () => {
        const result = await transformSvelte(
            getMockedConfig([mockedReg1]),
            `
<tdc-icon tdc={{some: "", obj: ""}}>
<div></div>
</tdc-icon>
`
        );

        expect(result.code).toMatchInlineSnapshot(`
          "<script>import {TdcIcon} from \\"@frontline-hq/tdc/Icon\\";
          </script>
          <TdcIcon tdc={{\\"styles\\":{},\\"children\\":{}}}>
          <div></div>
          </TdcIcon>
          "
        `);
    });
    test("nested transform", async () => {
        const result = await transformSvelte(
            getMockedConfig([mockedReg1, mockedReg2]),
            `
<tdc-wrapper tdc={{}}>
<tdc-icon tdc={{}}>
<div></div>
</tdc-icon>
</tdc-wrapper>
`
        );
        expect(result.code).toMatchInlineSnapshot(`
          "<script>import {TdcWrapper} from \\"@frontline-hq/tdc/Wrapper\\";
          import {TdcIcon} from \\"@frontline-hq/tdc/Icon\\";
          </script>
          <TdcWrapper tdc={{\\"styles\\":{},\\"children\\":{}}}>
          <TdcIcon tdc={{\\"styles\\":{},\\"children\\":{}}}>
          <div></div>
          </TdcIcon>
          </TdcWrapper>
          "
        `);
    });
});
