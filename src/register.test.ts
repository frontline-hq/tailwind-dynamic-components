import { describe, expect, expectTypeOf, test } from "vitest";
import {
    BaseStyles,
    CompoundStyles,
    Registration,
    Styles,
    parametersToVariants,
} from "./register";

export const literals = [
    /* matches with variants */
    "hover:md:sm_b0is",
    " hover:md:sm_b0is",
    "md:sm_b0is",
    "md:sm_b0is ",
    /* matches with no variants */
    "hover:md:b0is",
    " hover:md:b0is",
    "md:b0is",
    "md:b0is ",
    /* matches but no modifiers */
    "b0is",
    " b0is",
    `
    b0is `,
    "sm_b0is",
    " sm_b0is",
    `
    sm_b0is `,
    /* rejects */
    " :hover:md:b0is",
    "hover:md:ab0is",
    ":b0is",
    "hover:md::b0is",
    "hover:mdb0is",
    "hover:md:b0isa",
    "b0i",
    "md:b0is b0i",
    "b0is b0i",
    "b0isa",
    "ab0is",
    " :hover:md:sm_b0is",
    "hover:md:sm_ab0is",
    ":sm_b0is",
    "hover:md::sm_b0is",
    "hover:mdsm_b0is",
    "hover:md:sm_b0isa",
    "sm_b0i",
    "md:sm_b0is b0i",
    "sm_b0is b0i",
    "sm_b0isa",
    "sm_ab0is",
];

export const baseStyles1 = new BaseStyles("b0is");
export const baseStyles2 = new BaseStyles("b0is", { variants: ["sm", "md"] });

describe("BaseStyles", () => {
    describe("instantiation", () => {
        test("Simple", () => {
            expect(baseStyles1.description).toBe("b0is");
        });
        test("variants", () => {
            expect(baseStyles2.variants).toStrictEqual(["sm", "md"]);
        });
    });
    describe("literal matching", () => {
        const matchResultsDescription = literals.map(l =>
            baseStyles1.matchDescription(l)
        );
        const matchResultsDescriptionVariants = literals.map(l =>
            baseStyles2.matchDescription(l)
        );
        describe("descriptionRegex", () => {
            test("no variants", () => {
                expect(baseStyles1.descriptionRegex).toEqual(
                    /(?<=^([^\t\n\r\s:]+:)*)b0is$/g
                );
            });
            test("variants", () => {
                expect(baseStyles2.descriptionRegex).toEqual(
                    /(?<=^([^\t\n\r\s:]+:)*(sm|md)_)b0is$/g
                );
            });
        });
        describe("modifiersRegex", () => {
            test("no variants", () => {
                expect(baseStyles1.modifiersRegex).toEqual(
                    /^([^\t\n\r\s:]+:)+(?=b0is$)/g
                );
            });
            test("variants", () => {
                expect(baseStyles2.modifiersRegex).toEqual(
                    /^([^\t\n\r\s:]+:)+(?=(sm|md)_b0is$)/g
                );
            });
        });
        describe("variantsRegex", () => {
            test("no variants", () => {
                expect(baseStyles1.variantsRegex).toEqual(/^$/g);
            });
            test("variants", () => {
                expect(baseStyles2.variantsRegex).toEqual(
                    /(?<=^([^\t\n\r\s:]+:)*)(sm|md)(?=_b0is$)/g
                );
            });
        });
        describe("matchDescription", () => {
            test("no variants", () => {
                expect(matchResultsDescription).toEqual([
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    "b0is",
                    "b0is",
                    "b0is",
                    "b0is",
                    "b0is",
                    "b0is",
                    "b0is",
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                ]);
            });
            test("variants", () => {
                expect(matchResultsDescriptionVariants).toEqual([
                    "b0is",
                    "b0is",
                    "b0is",
                    "b0is",
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    "b0is",
                    "b0is",
                    "b0is",
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                ]);
            });
        });
        test("matchModifier", () => {
            const matchResultsDescription = literals.map(l =>
                baseStyles2.matchModifiers(l)
            );
            expect(matchResultsDescription).toEqual([
                "hover:md:",
                "hover:md:",
                "md:",
                "md:",
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
            ]);
        });
        test("matchVariants", () => {
            const matchResultsVariant = literals.map(l =>
                baseStyles2.matchVariant(l)
            );
            expect(matchResultsVariant).toEqual([
                "sm",
                "sm",
                "sm",
                "sm",
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                "sm",
                "sm",
                "sm",
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
            ]);
        });
    });
    test("getIdentifier, getLiteral", () => {
        const identifiers = literals.map(
            l => baseStyles1.matchDescription(l) && baseStyles1.getIdentifier(l)
        );
        const identifiersDecoded = identifiers.map(i =>
            baseStyles1.getLiteral(i)
        );

        return expect(identifiersDecoded).toEqual([
            undefined,
            undefined,
            undefined,
            undefined,
            "hover:md:b0is",
            "hover:md:b0is",
            "md:b0is",
            "md:b0is",
            "b0is",
            "b0is",
            "b0is",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
        ]);
    });
});

export const styles1 = new Styles("b0is", {
    variants: ["sm", "md"],
    dependencies: {
        color: ["blue", "gray"],
        heights: ["h1", "h2"],
        widths: ["w1", "w2"],
    },
})
    .staticStyles(d =>
        d("color", {
            blue: "text-blue-500",
            gray: d("heights", "text-gray-500", { h1: "text-gray-700" }),
        })
    )
    .staticStyles(d =>
        d("widths", {
            w1: "border-blue-500",
            w2: "border-gray-500",
        })
    )
    .staticStyles(d => d("heights", "h-100", { h1: "h-200" }))
    .staticStyles(() => "display-none antialiased")
    .staticStyles("border-0")
    .dynamicStyles("space-x-1 space-y-2")
    .dynamicStyles(() => "p-4")
    .dynamicStyles(v => v("ring-2", { md: "ring-4" }))
    .dynamicStyles((_, d) =>
        d("heights", "translate-x-0", { h1: "translate-x-2" })
    )
    .dynamicStyles((v, d) =>
        d("heights", `scale-${v("50", { sm: "75" })}`, {
            h1: `scale-${v({ sm: "90", md: "95" })}`,
        })
    );

export const compoundStyle1 = new CompoundStyles("b0s", {
    variants: ["sm", "md"],
})
    .add(styles1)
    .addInline("b0as")
    .addInline("c0is", {
        dependencies: {
            color: ["blue", "black"],
            shadow: ["gray", "green"],
        },
    });

describe("Styles", () => {
    test("compile", async () => {
        expect(await styles1.compile(baseStyles1.getIdentifier("md:sm_b0is")))
            .toMatchInlineSnapshot(`
          "export default ({color, heights, widths} = {}) => \`\${({
              blue: \\"text-blue-500\\",

              gray: {
                  h1: \\"text-gray-700\\"
              }[heights] ?? \\"text-gray-500\\"
          })[color] ?? \\"\\"} \${({
              w1: \\"border-blue-500\\",
              w2: \\"border-gray-500\\"
          })[widths] ?? \\"\\"} \${({
              h1: \\"h-200\\"
          })[heights] ?? \\"h-100\\"} display-none antialiased border-0 md:space-x-1 md:space-y-2 md:p-4 md:ring-2 \${({
              h1: \\"md:translate-x-2\\"
          })[heights] ?? \\"md:translate-x-0\\"} \${({
              h1: \\"md:scale-90\\"
          })[heights] ?? \\"md:scale-75\\"}\`"
        `);
    });
    test("propType", () => {
        expectTypeOf(styles1["propType"]).toEqualTypeOf<
            (
                | string
                | ((
                      d?:
                          | {
                                readonly color: "blue" | "gray";
                                readonly heights: "h1" | "h2";
                                readonly widths: "w1" | "w2";
                            }
                          | undefined
                  ) => string)
            )[]
        >();
    });
});

describe("CompoundStyles", () => {
    test("propType", () => {
        expectTypeOf(compoundStyle1["propType"]).toEqualTypeOf<
            (
                | string
                | {
                      [x: string]: (string | ((d?: undefined) => string))[];
                      b0is: (
                          | string
                          | ((
                                d?:
                                    | {
                                          readonly color: "blue" | "gray";
                                          readonly heights: "h1" | "h2";
                                          readonly widths: "w1" | "w2";
                                      }
                                    | undefined
                            ) => string)
                      )[];
                      b0as: (
                          | string
                          | ((
                                d?: { [x: string]: string } | undefined
                            ) => string)
                      )[];
                      c0is: (
                          | string
                          | ((
                                d?:
                                    | {
                                          readonly color: "blue" | "black";
                                          readonly shadow: "gray" | "green";
                                      }
                                    | undefined
                            ) => string)
                      )[];
                  }
            )[]
        >();
    });
    describe("unique description error", () => {
        test("addInline", () => {
            try {
                expect(
                    new CompoundStyles("some-description").addInline(
                        "some-description"
                    )
                ).toThrowError("Description has to be unique.");
            } catch (error) {}
        });
        test("add", () => {
            try {
                expect(
                    new CompoundStyles("some-description").add(
                        new Styles("some-description")
                    )
                ).toThrowError("Description has to be unique.");
            } catch (error) {}
        });
    });
    test("compile", async () => {
        expect(
            await compoundStyle1.compile(
                baseStyles1.getIdentifier("md:sm_b0s"),
                (ref: string) => `./${ref}.js`
            )
        ).toMatchInlineSnapshot(`
          "import BGBXXhXQzMBHMXv from \\"./BGBXXhXQzMBHMXv.js\\";
          import BGBXXhXQzMBHLfF from \\"./BGBXXhXQzMBHLfF.js\\";
          import BGBXXhXQzMECsCD from \\"./BGBXXhXQzMECsCD.js\\";

          export default {
              b0is: BGBXXhXQzMBHMXv,
              b0as: BGBXXhXQzMBHLfF,
              c0is: BGBXXhXQzMECsCD
          };"
        `);
    });
});

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
            props: { size: ["xl", "2xl"] },
            styles: () => ({
                a: "",
            }),
            dependencies: {},
            mappings: {},
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
                    size: m => m("destructive", { true: "xl", false: "2xl" }),
                },
            },
        });
        expect(
            registration.compile({
                destructive: "true",
                size: { default: "sm", "hover:md": "md" },
            })
        ).toEqual({
            styles: {
                a: ["h-4", "bg-red-400", "hover:md:h-8"],
                b: ["w-12", "hover:md:w-16"],
            },
        });
    });
});

// Which styles should be prepended?
