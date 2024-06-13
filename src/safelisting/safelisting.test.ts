import { describe, expect, test } from "vitest";
import { safelistFromCompiled, transpileSvelte } from "./safelisting";

describe("transpileSvelte", () => {
    test("simple", () => {
        const transpileResult = transpileSvelte(`
<div />
`);
        expect(transpileResult).toMatchInlineSnapshot(`
          "
          <div />
          "
        `);
    });
    test("script", () => {
        const transpileResult = transpileSvelte(`
<script lang="ts"></script>
<div />
`);
        expect(transpileResult).toMatchInlineSnapshot(`
          "
          <script lang=\\"ts\\"></script>
          <div />
          "
        `);
    });
    test("script and context module", () => {
        const transpileResult = transpileSvelte(`
<script lang="ts" context="module"></script>
<script lang="ts"></script>
<div />
`);
        expect(transpileResult).toMatchInlineSnapshot(`
          "
          <script lang=\\"ts\\" context=\\"module\\"></script>
          <script lang=\\"ts\\"></script>
          <div />
          "
        `);
    });
});
describe("Safelist", () => {
    test("from compile", () => {
        const compileResult = {
            children: {
                icon: {
                    children: {},
                    styles: {
                        c: ["border-2", "text-red-400", "border-4"],
                    },
                },
            },
            styles: {
                a: ["h-4", "bg-red-400", "h-8"],
                b: ["w-12", "w-16"],
            },
        };
        expect(safelistFromCompiled(compileResult)).toEqual([
            "h-4",
            "bg-red-400",
            "h-8",
            "w-12",
            "w-16",
            "border-2",
            "text-red-400",
            "border-4",
        ]);
    });
    test("from compile all", () => {
        const compileAllResult = [
            {
                children: {},
                styles: {
                    c: ["border-2", "text-red-400"],
                },
            },
            {
                children: {},
                styles: {
                    c: ["border-2", "text-green-400"],
                },
            },
            {
                children: {},
                styles: {
                    c: ["border-4", "text-red-400"],
                },
            },
            {
                children: {},
                styles: {
                    c: ["border-4", "text-green-400"],
                },
            },
        ];
        expect(safelistFromCompiled(compileAllResult)).toEqual([
            "border-2",
            "text-red-400",
            "text-green-400",
            "border-4",
        ]);
    });
});

// Which styles should be prepended?
