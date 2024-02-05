import merge from "lodash.merge";
import mergeWith from "lodash.mergewith";

export const variantDescriptionDelimiter = "_";
export const whitespaceCharsRegex = "\\t\\n\\r\\s";

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
