import { Registration, whitespaceCharsRegex } from "../register";
import uniq from "lodash.uniq";
import { asyncWalk } from "estree-walker";
import { Node, ObjectExpression } from "estree";
import { shortLibraryName } from "../library.config";
import { findDeclarableIdentifier } from "../ast/ast";
import {
    Ast,
    Attribute,
    Element,
    MustacheTag,
} from "svelte/types/compiler/interfaces";
import { parse } from "svelte/compiler";
import type { ASTNode } from "ast-types";
import MagicString from "magic-string";
import { safelistFromCompiled } from "../safelisting/safelisting";

function nodeIsAttribute(node: ASTNode): node is Attribute {
    return node.type === "Attribute";
}

function nodeIsElement(node: ASTNode): node is Element {
    return node.type === "Element";
}

function nodeIsMustacheTag(node: ASTNode): node is MustacheTag {
    return node.type === "MustacheTag";
}

function nodeIsObjectExpression(
    node: ASTNode
): node is ObjectExpression & { start: number; end: number } {
    return node.type === "ObjectExpression";
}

export function findMatchingRegistrations(
    elementName: string,
    registrations: Registration[],
    tagNameDelimiter: string
): Registration | void {
    const exactMatch = registrations.find(r => r.identifier === elementName);
    if (exactMatch) return exactMatch;
    const partialMatch = registrations.find(r =>
        elementName.startsWith(r.identifier + tagNameDelimiter)
    );
    if (partialMatch) {
        return findMatchingRegistrations(
            elementName.substring(
                partialMatch.identifier.length + tagNameDelimiter.length
            ),
            Object.values(partialMatch.dependencies),
            tagNameDelimiter
        );
    }
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

export async function analyze(
    markup: string,
    registrations: Registration[],
    tagNameDelimiter: string
) {
    // Imports to add: declarableComponentName -> importPath (named imports!!)
    const importsToAdd = new Map<string, string>();
    const elementsToReplace: Array<{
        start: number;
        end: number;
        transformed: string;
    }> = [];
    const safelist: string[] = [];

    const ast: Ast = parse(markup);

    await asyncWalk(ast as unknown as Node, {
        async enter(node: ASTNode) {
            if (nodeIsElement(node)) {
                const componentName = resolveComponentName(
                    node.name,
                    tagNameDelimiter
                );
                if (componentName !== undefined) {
                    const matchingRegistration = findMatchingRegistrations(
                        node.name.substring(
                            shortLibraryName.length + tagNameDelimiter.length
                        ),
                        /* getLibraryConfig(). */ registrations,
                        tagNameDelimiter
                    );
                    if (matchingRegistration) {
                        // find declarable identifier:
                        const declarableComponentName =
                            await findDeclarableIdentifier(
                                ast,
                                componentName,
                                asyncWalk
                            );
                        importsToAdd.set(
                            declarableComponentName,
                            matchingRegistration.importPath
                        );
                        // Find the library attribute object expression
                        const libraryAttributeExpression = (
                            (
                                node.attributes.find(
                                    a =>
                                        nodeIsAttribute(a) &&
                                        a.name === shortLibraryName
                                ) as Attribute | undefined
                            )?.value.find(v => nodeIsMustacheTag(v)) as
                                | MustacheTag
                                | undefined
                        )?.expression;
                        if (
                            libraryAttributeExpression &&
                            nodeIsObjectExpression(libraryAttributeExpression)
                        ) {
                            // extract the library attribute object expression string
                            const evalString = markup.slice(
                                libraryAttributeExpression.start,
                                libraryAttributeExpression.end
                            );
                            // compile with found props
                            const evalResult = (0, eval)(
                                "(" + evalString + ")"
                            );
                            const compiled =
                                matchingRegistration.compile(evalResult);
                            safelist.push(...safelistFromCompiled(compiled));
                            // The string of the whole component in the markup: "<tdc-button tdc={{}}>...</tdc-button>"
                            const s = new MagicString(
                                markup.slice(node.start, node.end)
                            );
                            // Replace compiled result
                            s.update(
                                libraryAttributeExpression.start - node.start,
                                libraryAttributeExpression.end - node.end,
                                JSON.stringify(compiled)
                            );
                            // Replace component opening tag
                            s.replace(
                                new RegExp(`^<${node.name}`, "g"),
                                `<${declarableComponentName}`
                            );
                            s.replace(
                                new RegExp(
                                    `</${node.name}(?=[${whitespaceCharsRegex}]*>$)`
                                ),
                                `</${declarableComponentName}`
                            );
                            elementsToReplace.push({
                                start: node.start,
                                end: node.end,
                                transformed: s.toString(),
                            });
                        }
                    }
                }
            }
        },
    });

    return {
        ast,
        importsToAdd,
        elementsToReplace,
        safelist: uniq(safelist),
    };
}
