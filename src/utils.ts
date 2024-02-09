import type { ASTNode } from "ast-types";
import type {
    Attribute,
    Element,
    MustacheTag,
} from "svelte/types/compiler/interfaces";

import type { ObjectExpression } from "estree";
import { shortLibraryName } from "./library.config";
import type { Registration } from "./register";

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
