/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vite";
import packageJson from "./package.json";
import nodePolyfills from "rollup-plugin-polyfill-node";
import { libraryName } from "./src/library.config";

const getPackageName = () => {
    return packageJson.name;
};

const getPackageNameCamelCase = () => {
    try {
        return getPackageName().replace(/-./g, char => char[1].toUpperCase());
    } catch (err) {
        throw new Error("Name property in package.json is missing.");
    }
};

const fileName = {
    es: (name: string) => `${name}.mjs`,
    cjs: (name: string) => `${name}.cjs`,
};

const formats = Object.keys(fileName) as Array<keyof typeof fileName>;

module.exports = defineConfig({
    base: "./",
    build: {
        ssr: true,
        lib: {
            entry: [path.resolve(__dirname, "src/index.ts"), path.resolve(__dirname, "src/plugin.ts")],
            name: libraryName,
            formats,
            fileName: (format, entryName) => fileName[format](entryName),
        },
        rollupOptions: {
            external: [
				"path",
				"fs/promises",
				"url",
                "base-x",
                "recast",
                "ts-dedent",
                "ast-types",
                "estree-walker",
                "magic-string",
                "svelte",
				"@sveltejs/kit",
				"@sveltejs/vite-plugin-svelte",
                "@babel/parser"
            ],
            output: {
                globals: {
                    path: "require('path')",
                    "fs/promises": "require('fs/promises')",
                    url: "require('url')",
                    "base-x": "require('base-x')",
                    recast: "require('recast')",
                    "ts-dedent": "require('ts-dedent')",
                    "ast-types": "require('ast-types')",
                    "magic-string": "require('magic-string')",
                    "svelte/compiler": "require('svelte/compiler')",
                    "@babel/parser": "require('@babel/parser')"
                },
            },
            plugins: [],
        },
    },
    test: {},
});
