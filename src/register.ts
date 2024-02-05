import baseX from "base-x";
import { builders as b, namedTypes as n } from "ast-types";
import merge from "lodash.merge";
import mergeWith from "lodash.mergewith";

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
export const whitespaceCharsRegex = "\\t\\n\\r\\s";
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

type RegistrationPropsKey = string | number | symbol;
type RegistrationPropsValue = (string | number | symbol)[];
type RegistrationProps = Record<RegistrationPropsKey, RegistrationPropsValue>;

type RegistrationDependenciesKey = string | number | symbol;

type RegistrationStylePropertyKey = string | number | symbol;
type RegistrationStyleProperties = Record<RegistrationStylePropertyKey, string>;

type RegistrationDependencies = {
    [key: RegistrationDependenciesKey]: Registration;
};

type RegistrationCompileParameters<Props extends RegistrationProps> = {
    [P in keyof Props]:
        | Props[P][number]
        | { default: Props[P][number]; [twModifier: string]: Props[P][number] };
};

type RegistrationMappings<
    Dependencies extends RegistrationDependencies,
    Props extends RegistrationProps,
> = {
    [D in keyof Dependencies]: {
        [DependencyPropsKey in keyof Dependencies[D]["props"]]: (
            m: M<Props, Dependencies[D]["props"], DependencyPropsKey>
        ) => RegistrationCompileParameters<
            Dependencies[D]["props"]
        >[DependencyPropsKey];
    };
};

type S<Props extends RegistrationProps> = <
    const PropsKey extends keyof Props,
    const PropsValue extends Props[PropsKey][number],
>(
    prop: PropsKey,
    ...styles:
        | [string, Partial<Record<PropsValue, string>>]
        | [Record<PropsValue, string>]
) => string;

// (PropsKey, {PropValue, DependencyPropValue})

type M<
    Props extends RegistrationProps,
    DependencyProps extends RegistrationProps,
    DependencyPropsKey extends keyof DependencyProps,
> = <
    const PropsKey extends keyof Props,
    const PropsValue extends Props[PropsKey][number],
    const DependencyPropValue extends
        DependencyProps[DependencyPropsKey][number],
>(
    prop: PropsKey,
    ...styles:
        | [
              DependencyPropValue,
              Partial<Record<PropsValue, DependencyPropValue>>,
          ]
        | [Record<PropsValue, DependencyPropValue>]
) => RegistrationCompileParameters<DependencyProps>[DependencyPropsKey];

const getM = <
    const Props extends RegistrationProps,
    const DependencyProps extends RegistrationProps,
    const DependencyPropsKey extends keyof DependencyProps,
    const CompileParameters extends
        RegistrationCompileParameters<Props> = RegistrationCompileParameters<Props>,
>(
    compileParameters: CompileParameters
): M<Props, DependencyProps, DependencyPropsKey> => {
    return (prop, ...styles) => {
        const compileParameterValue = compileParameters[prop];
        const fn = (index: string | number | symbol) =>
            (
                (styles[1] ?? styles[0]) as unknown as Record<
                    string | number | symbol,
                    string
                >
            )[index] ?? styles[0];
        if (
            typeof compileParameterValue === "string" ||
            typeof compileParameterValue === "number" ||
            typeof compileParameterValue === "symbol"
        ) {
            return fn(compileParameterValue);
        }
        return Object.fromEntries(
            Object.entries(compileParameterValue).map(([k, v]) => [k, fn(v)])
        ) as {
            [twModifier: string]: DependencyProps[DependencyPropsKey][number];
            default: DependencyProps[DependencyPropsKey][number];
        };
    };
};

/**
 * Turns compile parameters to an object representing the variants we need to process:
 * @example
 * parametersToVariants({
 *   destructive: true,
 *   hierarchy: 'primary',
 *   size: { default: 'sm', 'hover:md': 'md' }
 * })
 * // Returns
 * {
 *   default: {
 *     destructive: true,
 *     hierarchy: 'primary',
 *     size: 'sm'
 *   },
 *   'hover:md': {
 *     destructive: true,
 *     hierarchy: 'primary',
 *     size: 'md'
 *   }
 * }
 */
export function parametersToVariants<
    const Props extends RegistrationProps,
    const PropsKey extends keyof Props,
    const PropsValue extends Props[PropsKey][number],
    const VariantsValue extends Record<PropsKey, PropsValue>,
    const CompileParameters extends RegistrationCompileParameters<Props>,
>(parameters: CompileParameters) {
    const variants: Record<string, VariantsValue> = {};
    for (const k1 in parameters) {
        if (Object.prototype.hasOwnProperty.call(parameters, k1)) {
            const v1 = parameters[k1];
            if (
                typeof v1 === "string" ||
                typeof v1 === "symbol" ||
                typeof v1 === "number"
            ) {
                merge(variants, { default: { [k1]: v1 } });
            } else {
                for (const k2 in v1) {
                    if (Object.prototype.hasOwnProperty.call(v1, k2)) {
                        merge(variants, { [k2]: { [k1]: v1[k2] } });
                    }
                }
            }
        }
    }
    return Object.fromEntries(
        Object.entries(variants).map(([k, v]) => {
            return [k, merge({ ...variants["default"] }, v)];
        })
    ) as {
        default: VariantsValue;
        [twModifier: string]: VariantsValue;
    };
}

function mappingToCompileParameters<
    const Props extends RegistrationProps,
    const Dependencies extends RegistrationDependencies,
    const Mappings extends RegistrationMappings<Dependencies, Props>,
    const CompileParameters extends
        RegistrationCompileParameters<Props> = RegistrationCompileParameters<Props>,
>(
    mappings: Mappings,
    compileParameters: CompileParameters
): {
    [P in keyof Dependencies]: RegistrationCompileParameters<
        Dependencies[P]["props"]
    >;
} {
    const obj = {};
    for (const dependencyKey in mappings) {
        if (Object.prototype.hasOwnProperty.call(mappings, dependencyKey)) {
            const dependencyMapping = mappings[dependencyKey];
            for (const dependencyMappingKey in dependencyMapping) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        dependencyMapping,
                        dependencyMappingKey
                    )
                ) {
                    const dependencyMappingFunction =
                        dependencyMapping[dependencyMappingKey];
                    merge(obj, {
                        [dependencyKey]: {
                            [dependencyMappingKey]: dependencyMappingFunction(
                                getM(compileParameters)
                            ),
                        },
                    });
                }
            }
        }
    }
    return obj as {
        [DK in keyof Dependencies]: RegistrationCompileParameters<
            Dependencies[DK]["props"]
        >;
    };
}

interface StyleCompileResult<
    StyleProperties extends RegistrationStyleProperties,
> {
    styles: { [StylePropertyKey in keyof StyleProperties]: Array<string> };
}

export interface CompileResult<
    StyleProperties extends
        RegistrationStyleProperties = RegistrationStyleProperties,
    Dependencies extends RegistrationDependencies = RegistrationDependencies,
> {
    styles: StyleCompileResult<StyleProperties>["styles"];
    children: {
        [DependencyKey in keyof Dependencies]: CompileResult<
            ReturnType<Dependencies[DependencyKey]["styles"]>,
            Dependencies[DependencyKey]["dependencies"]
        >;
    };
}

export class Registration<
    const Identifier extends string = string,
    const Props extends RegistrationProps = RegistrationProps,
    const StyleProperties extends
        RegistrationStyleProperties = RegistrationStyleProperties,
    const Dependencies extends
        RegistrationDependencies = RegistrationDependencies,
    const Mappings extends RegistrationMappings<
        Dependencies,
        Props
    > = RegistrationMappings<Dependencies, Props>,
    const CompileParameters extends
        RegistrationCompileParameters<Props> = RegistrationCompileParameters<Props>,
> {
    identifier;
    props;
    styles;
    dependencies;
    mappings;
    importPath;
    constructor({
        identifier,
        props,
        styles,
        dependencies,
        mappings,
        importPath,
    }: {
        identifier: Identifier;
        props: Props;
        styles: (s: S<Props>) => StyleProperties;
        dependencies: Dependencies;
        mappings: Mappings;
        importPath: string;
    }) {
        this.identifier = identifier;
        this.props = props;
        this.styles = styles;
        this.dependencies = dependencies;
        this.mappings = mappings;
        this.importPath = importPath;
    }

    compile(
        parameters: CompileParameters
    ): CompileResult<StyleProperties, Dependencies> {
        const variants = parametersToVariants(parameters);
        // Generate compiled styles as object {default: {a: ["", "", ...], b: ...}, "hover:md": {a: ["", "", ...], b: ...}}
        const stylesSortedByVariants = Object.fromEntries(
            Object.entries(variants).map(([k, v]) => [
                k,
                Object.fromEntries(
                    Object.entries(
                        this.styles((prop, ...styles) => {
                            const i = v[prop];
                            if (styles.length === 2)
                                if (Object.hasOwn(styles[1], i))
                                    return styles[1][i] as string;
                                else return styles[0];
                            return styles[0][i as keyof (typeof styles)[0]];
                        })
                    ).map(([k1, v1]) => [
                        k1,
                        v1.split(new RegExp(`[${whitespaceCharsRegex}]+`, "g")),
                    ])
                ),
            ])
        );
        // Remove duplicate values from everything but default, then join styles again to string.
        const stylesJoinedAndDeduped = Object.fromEntries(
            Object.entries(stylesSortedByVariants).map(([k1, v1]) => [
                k1,
                Object.fromEntries(
                    Object.entries(v1).map(([k2, v2]) => [
                        k2,
                        k1 === "default"
                            ? v2
                            : v2
                                  .filter(
                                      v =>
                                          !stylesSortedByVariants["default"][
                                              k2
                                          ].includes(v)
                                  )
                                  .map(v => k1 + ":" + v),
                    ])
                ),
            ])
        );
        const styles: Record<string, Array<string>> = {};
        for (const key in stylesJoinedAndDeduped) {
            if (
                Object.prototype.hasOwnProperty.call(
                    stylesJoinedAndDeduped,
                    key
                )
            ) {
                mergeWith(
                    styles,
                    stylesJoinedAndDeduped[key],
                    (objVal, srcVal) =>
                        Array.isArray(objVal)
                            ? objVal.concat(srcVal)
                            : undefined
                );
            }
        }
        const children = Object.fromEntries(
            Object.entries(this.dependencies).map(
                ([dependencyKey, dependencyRegistration]) => [
                    dependencyKey,
                    dependencyRegistration.compile(
                        mappingToCompileParameters(this.mappings, parameters)[
                            dependencyKey
                        ]
                    ),
                ]
            )
        );
        return {
            styles,
            children,
        } as CompileResult<StyleProperties, Dependencies>;
    }
}

export type TdcProp<R extends Registration> = ReturnType<R["compile"]>;
