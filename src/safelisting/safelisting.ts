import { readFile, writeFile } from "node:fs/promises";
import plugin from "tailwindcss/plugin";
import { resolve } from "node:path";
import { CompileResult } from "../register";

export async function reloadTailwind(
    configPath: string = "./tailwind.config.js"
) {
    const fileContent = await readFile(resolve(process.cwd(), configPath), {
        encoding: "utf8",
    });
    await writeFile(resolve(process.cwd(), configPath), fileContent);
}

export function getGlobalSafelist() {
    return (global as unknown as { safelist: string[] }).safelist;
}

export function setGlobalSafelist(safelist: string[]) {
    (global as unknown as { safelist: string[] }).safelist = safelist;
    return safelist;
}

export const dynamicSafelistPlugin = plugin(() => {}, {
    safelist: (global as unknown as { safelist: string[] }).safelist,
});

export function safelistFromCompiled(compiled: CompileResult): string[] {
    return [
        ...Object.values(compiled.styles).flatMap(s => s),
        ...Object.values(compiled.children).flatMap(c =>
            safelistFromCompiled(c)
        ),
    ];
}