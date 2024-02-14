import { describe, expect, test } from "vitest";
import { Registration, parametersToVariants } from "./register";

describe("parametersToVariants", () => {
    test("Convert simple parameters", () => {
        expect(
            parametersToVariants({
                destructive: "true",
                hierarchy: "primary",
                size: { default: "sm", "hover:md": "md" },
            })
        ).toEqual({
            default: {
                destructive: "true",
                hierarchy: "primary",
                size: "sm",
            },
            "hover:md": {
                destructive: "true",
                hierarchy: "primary",
                size: "md",
            },
        });
    });
    test("Convert complex parameters", () => {
        expect(
            parametersToVariants({
                destructive: "true",
                hierarchy: { default: "primary", sm: "secondary" },
                size: { default: "sm", "hover:md": "md" },
            })
        ).toEqual({
            default: {
                destructive: "true",
                hierarchy: "primary",
                size: "sm",
            },
            "hover:md": {
                destructive: "true",
                hierarchy: "primary",
                size: "md",
            },
            sm: {
                destructive: "true",
                hierarchy: "secondary",
                size: "sm",
            },
        });
    });
});

describe("Register", () => {
    test("Compile", () => {
        const iconRegistration = new Registration({
            identifier: "icon",
            props: { sizes: ["xl", "2xl"], destructive: ["true", "false"] },
            styles: s => ({
                c: `border-${s("sizes", { xl: "2", "2xl": "4" })} text-${s(
                    "destructive",
                    "red",
                    { false: "green" }
                )}-400`,
            }),
            dependencies: {},
            mappings: {},
            importPath: "",
        });
        const registration = new Registration({
            identifier: "button",
            props: { size: ["sm", "md"], destructive: ["true", "false"] },
            styles: s => ({
                a: `h-${s("size", {
                    sm: "4",
                    md: "8",
                })} bg-${s("destructive", "red", { false: "green" })}-400`,
                b: `w-${s("size", { sm: "12", md: "16" })}`,
            }),
            dependencies: {
                icon: iconRegistration,
            },
            mappings: {
                icon: {
                    destructive: m =>
                        m("destructive", { true: true, false: false }),
                    sizes: m => m("size", { md: "2xl", sm: "xl" }),
                },
            },
            importPath: "",
        });
        expect(
            registration.compile({
                destructive: "true",
                size: { default: "sm", "hover:md": "md" },
            })
        ).toEqual({
            children: {
                icon: {
                    children: {},
                    styles: {
                        c: ["border-2", "text-red-400", "hover:md:border-4"],
                    },
                },
            },
            styles: {
                a: ["h-4", "bg-red-400", "hover:md:h-8"],
                b: ["w-12", "hover:md:w-16"],
            },
        });
    });
    test("CompileAll", () => {
        const iconRegistration = new Registration({
            identifier: "icon",
            props: { sizes: ["xl", "2xl"], destructive: ["true", "false"] },
            styles: s => ({
                c: `border-${s("sizes", { xl: "2", "2xl": "4" })} text-${s(
                    "destructive",
                    "red",
                    { false: "green" }
                )}-400`,
            }),
            dependencies: {},
            mappings: {},
            importPath: "",
        });
        expect(
            iconRegistration.compileAll('{sizes: "xl", destructive: "true"}')
        ).toEqual([
            {
                children: {},
                styles: {
                    c: ["border-2", "text-red-400"],
                },
            },
        ]);
    });
});

// Which styles should be prepended?
