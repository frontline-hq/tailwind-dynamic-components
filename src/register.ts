import baseX from "base-x";
import { builders as b, namedTypes as n } from "ast-types";

type DReturn = (modifiers?: string | undefined) => n.LogicalExpression;

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

export const variantDescriptionDelimiter = "_";
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
    const Description extends string | number | symbol = string,
    const Variants extends readonly string[] = readonly string[],
    const Dependencies extends Record<string, readonly string[]> = Record<
        string,
        readonly string[]
    >,
> extends BaseStyles<Description, Variants> {
    dependencies: Dependencies;
    styles: [
        Array<((d: D<Dependencies>) => DReturn | string) | string>,
        Array<
            | ((v: V<Variants[number]>, d: D<Dependencies>) => DReturn | string)
            | string
        >,
    ];
    propType = [
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _ => {
            throw new Error(
                "This function is for type safety purposes ONLY and shall therefore not be called."
            );
        },
    ] as Array<
        | ((d?: {
              [dependency in keyof Dependencies]: Dependencies[dependency][number];
          }) => string)
        | string
    >;

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
                const s = styles[1]?.[variant];
                return s ?? styles[0];
            }
            const s = styles[0][variant];
            return s;
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

    async compile(identifier: string) {
        const print = (await import("recast")).print;
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
            )}} = {}) => \`` +
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
    const CompoundDescription extends string = string,
    const Registrations extends Record<
        string,
        {
            dependencies: Record<string, readonly string[]>;
        }
    > = Record<string, never>,
    const Variants extends readonly string[] = readonly string[],
> extends BaseStyles<CompoundDescription, Variants> {
    styles: AddedStyles<Registrations, Variants>;
    propType = [{}] as Array<
        | {
              [K in keyof Registrations]: Styles<
                  (typeof this.styles)[K]["description"],
                  Variants,
                  (typeof this.styles)[K]["dependencies"]
              >["propType"];
          }
        | string
    >;
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
        if (description === (this.description as unknown as Description))
            throw new Error("Description has to be unique.");
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

    async compile(
        identifier: string,
        getFileName: (identifier: string) => string
    ) {
        const print = (await import("recast")).print;
        const literal = this.getLiteral(identifier);
        const variant = this.matchVariant(literal);
        const modifiers = this.matchModifiers(literal);
        return print(
            b.program([
                ...Object.entries(this.styles).map(
                    ([, v]: [
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
    }
}
/* 
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
      }; */

export function resolveProp<Dependencies>(
    prop: Array<((d: Dependencies) => string) | string>,
    dependencies: Dependencies
) {
    const mapped = prop.flatMap(p => {
        if (typeof p === "string")
            throw new Error(`Couldn't resolve Style "${p}"`);
        return p(dependencies).split(
            new RegExp(`[${whitespaceCharsRegex}]+`, "g")
        );
    });
    return [...new Set(mapped)].join(" ");
}
