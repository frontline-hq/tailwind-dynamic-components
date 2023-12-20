import baseX from "base-x";
import { print, types } from "recast";
const b = types.builders;

type DReturn = (
    modifiers?: string | undefined
) => types.namedTypes.LogicalExpression;

type DParameterValue = string | DReturn;
type DParameters<DependencyKeys extends string> =
    | [DParameterValue]
    | [DParameterValue, Partial<Record<DependencyKeys, DParameterValue>>]
    | [Record<DependencyKeys, DParameterValue>];

type D<Dependencies extends Record<string, readonly string[]>> = <
    DK extends keyof Dependencies,
>(
    dependency: DK,
    ...styles: DParameters<Dependencies[DK][number]>
) => DReturn;

type V<Variants extends string> = (
    ...styles:
        | [string, Partial<Record<Variants, string>>]
        | [Record<Variants, string>]
) => string;

function prependWithModifiers(s: string, modifiers?: string) {
    return modifiers == undefined
        ? s
        : (" " + s)
              .replaceAll(
                  new RegExp(`[${whitespaceCharsRegex}]+`, "g"),
                  " " + modifiers
              )
              .trimStart();
}

const variantDescriptionDelimiter = "_";
const whitespaceCharsRegex = "\\t\\n\\r\\s";
const twModifierRegex = `[^${whitespaceCharsRegex}:]+:`;
const getVariantRegex = (variants: readonly string[], delimiter = true) => {
    const variantsRegex = variants.join("|");
    return variantsRegex
        ? `(${variantsRegex})${delimiter ? variantDescriptionDelimiter : ""}`
        : "";
};

export function cleanLiteral(literal: string) {
    return literal.replaceAll(new RegExp(`[${whitespaceCharsRegex}]`, "g"), "");
}

export class BaseStyles<
    const Description extends string | number | symbol,
    const Variants extends readonly string[] = readonly string[],
> {
    description: Description;
    variants: Variants;
    descriptionRegex: RegExp;
    modifiersRegex: RegExp;
    variantsRegex: RegExp;
    identifierAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    literalEncoding: BufferEncoding = "utf8";
    constructor(
        description: Description,
        {
            variants = [] as unknown as Variants,
        }: {
            variants?: Variants;
        } = {}
    ) {
        this.description = description;
        this.variants = variants;
        this.modifiersRegex = new RegExp(
            `^(${twModifierRegex})+(?=${getVariantRegex(this.variants)}${String(
                this.description
            )}$)`,
            "g"
        );
        this.descriptionRegex = new RegExp(
            `(?<=^(${twModifierRegex})*${getVariantRegex(
                this.variants
            )})${String(this.description)}$`,
            "g"
        );
        this.variantsRegex = new RegExp(
            this.variants.length === 0
                ? `^$`
                : `(?<=^(${twModifierRegex})*)${getVariantRegex(
                      this.variants,
                      false
                  )}(?=${variantDescriptionDelimiter}${String(
                      this.description
                  )}$)`,
            "g"
        );
    }

    matchDescription = (literal: string) =>
        cleanLiteral(literal).match(this.descriptionRegex)?.[0] ?? undefined;

    matchModifiers = (literal: string) =>
        cleanLiteral(literal).match(this.modifiersRegex)?.[0] ?? undefined;

    matchVariant = (literal: string) =>
        (cleanLiteral(literal).match(
            this.variantsRegex
        )?.[0] as Variants[number]) ?? undefined;

    /* Only call on literals that are confirmed by `matchDescription(literal)` */
    getIdentifier(literal: string) {
        return baseX(this.identifierAlphabet).encode(
            Buffer.from(cleanLiteral(literal), this.literalEncoding)
        );
    }
    getLiteral<I extends string | undefined>(identifier: I): I {
        if (identifier == undefined) return undefined as I;
        return new TextDecoder()
            .decode(baseX(this.identifierAlphabet).decode(identifier))
            .toString() as I;
    }
    constructIdentifier(variant: string, modifiers?: string) {
        return this.getIdentifier(
            `${modifiers ?? ""}${variant}${variantDescriptionDelimiter}${String(
                this.description
            )}`
        );
    }
}

export class Styles<
    const Description extends string | number | symbol =
        | string
        | number
        | symbol,
    const Variants extends readonly string[] = readonly string[],
    const Dependencies extends Record<string, readonly string[]> = Record<
        string,
        readonly string[]
    >,
> extends BaseStyles<Description, Variants> {
    dependencies: Dependencies;
    styles: [
        Array<Parameters<typeof this.staticStyles>[0]>,
        Array<Parameters<typeof this.dynamicStyles>[0]>,
    ];

    constructor(
        description: Description,
        {
            variants = [] as unknown as Variants,
            dependencies = {} as unknown as Dependencies,
        }: {
            variants?: Variants;
            dependencies?: Dependencies;
        } = {}
    ) {
        super(description, { variants });
        this.dependencies = dependencies;
        this.styles = [[], []];
    }

    staticStyles(
        stat: ((d: D<Dependencies>) => DReturn | string) | string
        //...dyn: Array<(d: D) => Record<string, string | D>>
    ) {
        this.styles[0].push(stat);
        return this;
    }

    dynamicStyles(
        dyn:
            | ((v: V<Variants[number]>, d: D<Dependencies>) => DReturn | string)
            | string
    ) {
        this.styles[1].push(dyn);
        return this;
    }

    getV: <Variant extends Variants[number]>(variant: Variant) => V<Variant> =
        variant =>
        (...styles) => {
            if (typeof styles[0] === "string") {
                if (styles[1]?.[variant]) {
                    return styles[1][variant];
                }
                return styles[0];
            }
            return styles[0][variant];
        };

    d: D<Dependencies> =
        (dep, ...styles) =>
        (modifiers?: string) =>
            b.logicalExpression(
                "??",
                b.memberExpression(
                    b.objectExpression(
                        Object.entries(styles[1] ?? styles[0]).map(
                            ([k, v]: [string, string | DReturn]) => {
                                return b.property(
                                    "init",
                                    b.identifier(k),
                                    typeof v === "string"
                                        ? b.literal(
                                              prependWithModifiers(v, modifiers)
                                          )
                                        : v(modifiers)
                                );
                            }
                        )
                    ),
                    b.identifier(String(dep)),
                    true
                ),
                b.literal(
                    typeof styles[0] === "string"
                        ? prependWithModifiers(styles[0], modifiers)
                        : ""
                )
            );

    compile(identifier: string) {
        const literal = this.getLiteral(identifier);
        const variant = this.matchVariant(literal);
        const modifiers = this.matchModifiers(literal);
        const staticS = this.styles[0]
            .map(s => {
                if (typeof s === "string") return s;
                const sReturn = s(this.d);
                if (typeof sReturn === "string") return sReturn;
                return sReturn();
            })
            .map(s => (typeof s === "string" ? s : "${" + print(s).code + "}"));
        const dynamicS = this.styles[1]
            .map(s => {
                if (typeof s === "string")
                    return prependWithModifiers(s, modifiers);
                const sReturn = s(this.getV(variant), this.d);
                if (typeof sReturn === "string")
                    return prependWithModifiers(sReturn, modifiers);
                return sReturn(modifiers);
            })
            .map(s => (typeof s === "string" ? s : "${" + print(s).code + "}"));
        return (
            `export default ({${Object.keys(this.dependencies).join(
                ", "
            )}}) => \`` +
            [...staticS, ...dynamicS].join(" ") +
            "`"
        );
    }
}

type AddedStyles<
    Registrations extends {
        [description: string]: {
            dependencies: Record<string, readonly string[]>;
        };
    },
    Variants extends readonly string[],
> = {
    [R in keyof Registrations]: Styles<
        R,
        Variants,
        Registrations[R]["dependencies"]
    >;
};

export class CompoundStyles<
    const CompoundDescription extends string | number | symbol =
        | string
        | number
        | symbol,
    const Registrations extends Record<
        string,
        {
            dependencies: Record<string, readonly string[]>;
        }
    > = Record<string, never>,
    const Variants extends readonly string[] = readonly string[],
> extends BaseStyles<CompoundDescription, Variants> {
    styles: AddedStyles<Registrations, Variants>;
    constructor(
        description: CompoundDescription,
        {
            variants = [] as unknown as Variants,
            registrations = {} as Registrations,
        }: {
            variants?: Variants;
            registrations?: Registrations;
        } = {}
    ) {
        super(description, { variants });
        this.styles = Object.fromEntries(
            Object.entries(registrations).map(r => [
                r[0],
                new Styles(r[0], {
                    variants: this.variants,
                    dependencies: r[1].dependencies,
                }),
            ])
        ) as AddedStyles<Registrations, Variants>;
    }

    addInline = <
        const Description extends string,
        const Dependencies extends Record<string, readonly string[]> = Record<
            string,
            readonly string[]
        >,
    >(
        description: Description,
        {
            dependencies = {} as Dependencies,
        }: {
            dependencies?: Dependencies;
        } = {}
    ) => {
        return new CompoundStyles<
            CompoundDescription,
            Registrations & {
                [DescriptionKey in Description]: {
                    dependencies: Dependencies;
                };
            },
            Variants
        >(this.description, {
            variants: this.variants,
            registrations: Object.fromEntries(
                [
                    ...Object.entries(this.styles),
                    [description, { dependencies }],
                ].map(s => [s[0], { dependencies: s[1]["dependencies"] }])
            ),
        });
    };

    add = <
        const Description extends string,
        const Dependencies extends Record<string, readonly string[]> = Record<
            string,
            readonly string[]
        >,
    >(
        styles: Styles<Description, Variants, Dependencies>
    ) => this.addInline(styles.description, styles);

    compile = (
        identifier: string,
        getFileName: (identifier: string) => string
    ) => {
        const literal = this.getLiteral(identifier);
        const variant = this.matchVariant(literal);
        const modifiers = this.matchModifiers(literal);
        return print(
            b.program([
                ...Object.entries(this.styles).map(
                    ([k, v]: [
                        keyof AddedStyles<Registrations, Variants>,
                        AddedStyles<
                            Registrations,
                            Variants
                        >[keyof Registrations],
                    ]) => {
                        return b.importDeclaration(
                            [
                                b.importDefaultSpecifier(
                                    b.identifier(
                                        v.constructIdentifier(
                                            variant,
                                            modifiers
                                        )
                                    )
                                ),
                            ],
                            b.literal(
                                getFileName(
                                    v.constructIdentifier(variant, modifiers)
                                )
                            )
                        );
                    }
                ),
                b.exportDefaultDeclaration(
                    b.objectExpression(
                        Object.entries(this.styles).map(
                            ([k, v]: [
                                keyof AddedStyles<Registrations, Variants>,
                                AddedStyles<
                                    Registrations,
                                    Variants
                                >[keyof Registrations],
                            ]) =>
                                b.property(
                                    "init",
                                    b.identifier(String(k)),
                                    b.identifier(
                                        v.constructIdentifier(
                                            variant,
                                            modifiers
                                        )
                                    )
                                )
                        )
                    )
                ),
            ])
        ).code;
    };
}

export type PropType<S extends Styles | CompoundStyles> = S extends Styles
    ? (dependencies: {
          [Dependency in keyof S["dependencies"]]: S["dependencies"][Dependency][number];
      }) => string
    : {
          [Style in keyof CompoundStyles<
              S["description"],
              Record<string, never>,
              S["variants"]
          >["styles"]]: PropType<
              CompoundStyles<
                  S["description"],
                  Record<string, never>,
                  S["variants"]
              >
          >;
      };

const b0is = new Styles("b0is", {
    variants: ["sm", "md"],
    dependencies: { color: ["blue", "black"], shadow: ["gray", "green"] },
})
    .staticStyles(d =>
        d("shadow", { gray: d("color", "", { black: "" }), green: "" })
    )
    .dynamicStyles("some-dynamic");
const styles = b0is.styles[0][1];

const b0s = new CompoundStyles("b0s", {
    variants: ["sm", "md"],
})
    .addInline("c0is", {
        dependencies: {
            color: ["blue", "black"],
            shadow: ["gray", "green"],
        },
    })
    .add(b0is);

const d: PropType<typeof b0is> = ({ shadow, color }) => "";

const f: PropType<typeof b0s> = { b0is: "" };

type H = typeof b0s;
type Z = typeof b0is;

type G = H["styles"];

//.dynamicStyles(v => [v("default-class", { sm: "sm-style" })]);
// .dynamicStyles(v => [v({ sm: "sm-style", md: "md-style" })])
// .dynamicStyles(() => "")
// .dynamicStyles(() => [""]);
// .staticStyles(() => ["w-20 h-10"])
// .staticStyles("")
