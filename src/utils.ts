import { type ASTNode, namedTypes as n } from "ast-types";
import type {
    Attribute,
    Element,
    MustacheTag,
} from "svelte/types/compiler/interfaces";

import type { ObjectExpression } from "estree";
import { libraryName, shortLibraryName } from "./library.config";
import type {
    Registration,
    RegistrationCompileParameters,
    RegistrationProps,
    RegistrationPropsValue,
} from "./register";
import get from "lodash.get";
import set from "lodash.set";
import { Property, SpreadElement, parse } from "acorn";

export function nodeIsAttribute(node: ASTNode): node is Attribute {
    return node.type === "Attribute";
}

export function nodeIsElement(node: ASTNode): node is Element {
    return node.type === "Element";
}

export function nodeIsMustacheTag(node: ASTNode): node is MustacheTag {
    return node.type === "MustacheTag";
}

export function nodeIsObjectExpression(
    node: ASTNode
): node is ObjectExpression & { start: number; end: number } {
    return node.type === "ObjectExpression";
}

/**
 * Converts a "global" component name to a new name and import path:
 * @example
 * <tdc-button-icon />
 * // Gets converted to
 * {
 *   name: "TdcButtonIcon",
 *   importPath: "@frontline-hq/tailwind-dynamic-components"
 * }
 */
export function resolveComponentName(name: string, tagNameDelimiter: string) {
    const detectionRegex = new RegExp(
        `(?<=^${shortLibraryName}${tagNameDelimiter})([a-zA-Z]+${tagNameDelimiter})*[a-zA-Z]+$`,
        "g"
    );
    const match = name.match(detectionRegex);
    if (match)
        return (
            "Tdc" +
            match[0]
                .split(tagNameDelimiter)
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join("")
        );
    return;
}

type GlobalSafelist = Map<string, string[]>;

export function setGlobalSafelist(safelist: [string, string[]][]) {
    set(global, `${shortLibraryName}.safelist`, new Map(safelist));
}

export function getGlobalSafelist() {
    return get(global, `${shortLibraryName}.safelist`) as
        | GlobalSafelist
        | undefined;
}

export function getGlobalSafelistValue(key: string) {
    return (
        get(global, `${shortLibraryName}.safelist`) as
            | GlobalSafelist
            | undefined
    )?.get(key);
}

export function setGlobalSafelistValue(key: string, value: string[]) {
    const currentSafelist = getGlobalSafelist();
    if (currentSafelist == undefined) setGlobalSafelist([[key, value]]);
    else currentSafelist.set(key, value);
}

export function findMatchingRegistrations(
    elementName: string,
    registrations: Registration[],
    tagNameDelimiter: string,
    path: (string | number | symbol)[] = []
): { registration: Registration; path: (string | number | symbol)[] } | void {
    const exactMatchIndex = registrations.findIndex(
        r => r.identifier === elementName
    );
    if (exactMatchIndex > -1)
        return {
            registration: registrations[exactMatchIndex],
            path: [...path, exactMatchIndex],
        };
    const partialMatchIndex = registrations.findIndex(r =>
        elementName.startsWith(r.identifier + tagNameDelimiter)
    );
    if (partialMatchIndex > -1) {
        return findMatchingRegistrations(
            elementName.substring(
                registrations[partialMatchIndex].identifier.length +
                    tagNameDelimiter.length
            ),
            Object.values(registrations[partialMatchIndex].dependencies),
            tagNameDelimiter,
            [...path, partialMatchIndex, "dependencies"]
        );
    }
}
type ParameterVariantWithModifier<
    Props extends RegistrationProps,
    P extends keyof Props,
> = {
    [twModifier: string]: Props[P];
    default: Props[P];
};

function isRegistrationPropsValue<Props extends RegistrationProps>(
    variant:
        | ParameterVariantWithModifier<Props, keyof Props>
        | RegistrationPropsValue
): variant is RegistrationPropsValue {
    return Array.isArray(variant);
}

type RegistrationCompileParameterVariant<Props extends RegistrationProps> = {
    [P in keyof Props]: Props[P] | ParameterVariantWithModifier<Props, P>;
};

export function getPropPermutations<
    Props extends RegistrationProps,
    CompileParameters extends RegistrationCompileParameters<Props>,
>(
    parameterVariants: RegistrationCompileParameterVariant<Props>
): CompileParameters[] {
    if (parameterVariants == undefined) return [];
    const [kv, ...rest] = Object.entries(parameterVariants) as [
        keyof RegistrationCompileParameterVariant<Props>,
        RegistrationCompileParameterVariant<Props>[string | number],
    ][];
    if (kv == undefined) return [];
    const remaingingPermutations = getPropPermutations(
        Object.fromEntries(rest)
    );

    const value = kv[1];
    return (
        isRegistrationPropsValue(value) ? value : getPropPermutations(value)
    ).flatMap(v =>
        remaingingPermutations.length > 0
            ? remaingingPermutations.map(per => ({ [kv[0]]: v, ...per }))
            : { [kv[0]]: v }
    ) as CompileParameters[];
}

export function testProperty(property: Property | SpreadElement) {
    if (!n.Property.check(property))
        throw new Error(
            `We only support regular properties in ${libraryName}.`
        );
    const key = property.key;
    if (!n.Identifier.check(key) && !n.Literal.check(key))
        throw new Error(
            `Key of prop in ${libraryName} has to be an Identifier or Literal.`
        );
    const keyValue = n.Literal.check(key) ? key.value?.toString() : key.name;
    if (keyValue == undefined)
        throw new Error(
            `Can't evaluate value of key in props for ${libraryName}.`
        );
    return [keyValue, property.value] as const;
}

export function parseAndFindObjectExpression(evalString: string) {
    const ast = parse(`(${evalString})`, { ecmaVersion: 2020 });
    const body = ast.body;
    if (body.length !== 1)
        throw new Error(
            `Props in ${libraryName} can only contain one statement.`
        );
    const expressionStatement = body[0];
    if (!n.ExpressionStatement.check(expressionStatement))
        throw new Error("The Developer forgot to wrap this string in ().");

    const objectExpression = expressionStatement.expression;
    if (!n.ObjectExpression.check(objectExpression))
        throw new Error(`You need to wrap ${libraryName} props in {}.`);
    return objectExpression;
}

export function evalStringToParameterVariants<Props extends RegistrationProps>(
    evalString: string,
    props: Props
) {
    const objectExpression = parseAndFindObjectExpression(evalString);
    let type: "optimal" | "not-optimal" = "optimal";
    const parameterVariants = Object.fromEntries(
        objectExpression.properties.map(property => {
            const [keyValue, value] = testProperty(property);
            if (!(keyValue in props))
                throw new Error(
                    `Registered props in ${libraryName} do not contain key ${keyValue}`
                );

            // Predictable value, take values from props.
            if (n.Literal.check(value) && value.value != undefined) {
                if (!props[keyValue].includes(value.value.toString()))
                    throw new Error(
                        `Value of prop in ${libraryName} is not amongst the registered values.`
                    );
                return [keyValue, [value.value.toString()]];
            }

            if (n.ObjectExpression.check(value)) {
                return [
                    keyValue,
                    Object.fromEntries(
                        value.properties.map(nestedProperty => {
                            const [modifierValue, nestedValue] =
                                testProperty(nestedProperty);
                            // Predictable value of modifier
                            if (
                                n.Literal.check(nestedValue) &&
                                nestedValue.value != undefined
                            )
                                return [
                                    modifierValue,
                                    [nestedValue.value.toString()],
                                ];
                            // Unpredictable value, take values from props.
                            type = "not-optimal";
                            return [modifierValue, props[keyValue]];
                        })
                    ),
                ];
            }
            // Unpredictable value, take values from props.
            type = "not-optimal";
            return [keyValue, props[keyValue]];
        })
    ) as RegistrationCompileParameterVariant<Props>;
    return { type: type as "optimal" | "not-optimal", parameterVariants };
}
