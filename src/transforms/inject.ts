import {
    CompoundStyles,
    Registration,
    Styles,
    variantDescriptionDelimiter,
    whitespaceCharsRegex,
} from "../register";
import uniq from "lodash.uniq";
import { asyncWalk } from "estree-walker";
import { Node, ObjectExpression } from "estree";
import { shortLibraryName } from "../library.config";
import { findDeclarableIdentifier } from "../ast/ast";
import {
    Ast,
    Attribute,
    Text,
    Element,
    MustacheTag,
} from "svelte/types/compiler/interfaces";
import { parse } from "svelte/compiler";
import { ASTNode, namedTypes as n } from "ast-types";
import MagicString from "magic-string";
import { safelistFromCompiled } from "../safelisting/safelisting";
import { getLibraryConfig } from "../config/config";

export function newEmittedFiles() {
    return new Map<string, Emitted>();
}

export type Emitted = {
    styles: string;
    fileReference: string;
};
export type EmittedFiles = ReturnType<typeof newEmittedFiles>;

function templateLiteralValue(node: ASTNode) {
    // We are looking for a template literal with 0 expressions and
    if (
        n.TemplateLiteral.check(node) &&
        node.expressions.length === 0 &&
        node.quasis.length === 1 &&
        n.TemplateElement.check(node.quasis[0])
    ) {
        return {
            start: (node as AcornNode<n.TemplateLiteral>).start,
            end: (node as AcornNode<n.TemplateLiteral>).end,
            value: node.quasis[0].value.raw,
            type: "template" as const,
        };
    }
    return undefined;
}

function nodeIsAttribute(node: ASTNode): node is Attribute {
    return node.type === "Attribute";
}

function nodeIsText(node: ASTNode): node is Text {
    return node.type === "Text";
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

function attributeTextValue(node: ASTNode) {
    if (nodeIsAttribute(node) && nodeIsText(node.value[0]))
        return {
            start: node.start,
            end: node.end,
            value: node.value[0].data,
            type: "attribute" as const,
            name: node.name,
        };
    return undefined;
}

type AcornNode<N extends ASTNode> = N & { start: number; end: number };

type SearchResult = {
    value: string;
    start: number;
    end: number;
} & (
    | {
          type: "template" | "literal";
      }
    | {
          type: "attribute";
          name: string;
      }
);

export function getFileName(identifier: string) {
    return `virtual:${shortLibraryName}-${identifier}`;
}

async function runOnSearchResult(
    node: ASTNode,
    runOn: (searchResult: SearchResult) => Promise<void>
) {
    const element = n.Literal.check(node)
        ? typeof node.value === "string"
            ? {
                  value: node.value,
                  start: (node as AcornNode<n.Literal>).start,
                  end: (node as AcornNode<n.Literal>).end,
                  type: "literal" as const,
              }
            : undefined
        : templateLiteralValue(node) ?? attributeTextValue(node);
    if (element != undefined) await runOn(element);
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

const tagNameDelimiter = "-";

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

    const ast = parse(markup);

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

/* code: the code of the page to inject into */
/* registrations: the user provided registrations */
/* emittedIdentifiers: the identifiers already processed and placed in the emitted file */
export async function analyzeJsSvelte<AstType extends ASTNode | Ast>(
    ast: AstType,
    registrations: (Styles | CompoundStyles)[],
    emittedFiles: EmittedFiles,
    walker: typeof asyncWalk
) {
    // Imports to add
    const importsToAdd = new Map<string, string>();
    const elementsToReplace: ({
        declarableIdentifier: string;
    } & SearchResult)[] = [];

    // Find and replace occurences of identifiers
    await walker(ast as Node, {
        async enter(node: ASTNode) {
            // 1. Check whether it is the right node type
            // 2. If yes, Check for a match

            await runOnSearchResult(node, async literal => {
                const matchingRegistration = registrations.find(r => {
                    return r.matchDescription(literal.value);
                });
                // 3. If matching
                if (matchingRegistration) {
                    const identifier = matchingRegistration.getIdentifier(
                        literal.value
                    );
                    const modifiers = matchingRegistration.matchModifiers(
                        literal.value
                    );
                    const variant = matchingRegistration.matchVariant(
                        literal.value
                    );
                    const declarableIdentifier = await findDeclarableIdentifier(
                        ast,
                        identifier,
                        walker
                    );
                    const ref = getFileName(identifier);
                    emittedFiles.set(identifier, {
                        styles: await matchingRegistration.compile(
                            identifier,
                            getFileName
                        ),
                        fileReference: ref,
                    });
                    if (matchingRegistration instanceof CompoundStyles) {
                        // Construct emittedFiles for each child of compoundStyles.
                        await Promise.all(
                            Object.values(matchingRegistration.styles).map(
                                async s => {
                                    const subIdentifier = s.getIdentifier(
                                        `${
                                            modifiers ?? ""
                                        }${variant}${variantDescriptionDelimiter}${
                                            s.description
                                        }`
                                    );
                                    emittedFiles.set(subIdentifier, {
                                        styles: await s.compile(subIdentifier),
                                        fileReference:
                                            getFileName(subIdentifier),
                                    });
                                }
                            )
                        );
                    }
                    // Replace with alternative import name
                    // Replace literals: ""
                    // Replace attribute: attribute= "value" or attribute= value
                    elementsToReplace.push({
                        declarableIdentifier,
                        ...literal,
                    });
                    // Add to list of imports that we need to add to this file
                    importsToAdd.set(declarableIdentifier, ref);
                }
            });
        },
    });
    return {
        elementsToReplace: elementsToReplace,
        importsToAdd,
        emittedFiles: emittedFiles,
    };
    // Create a list with code injections
    // Emit a file with these code injections -> file reference
    // file reference -> inject code into file
    // Insert imports with identifiers
    // Replace identifiers with imports
}

// 1. Analyze: Script & Html (needs walker (js or svelte), ast, registrations and emittedFiles list ):
//		Find
//		- used literals
//		- declarable identifiers
//		- needed imports
// 2. Script:
// 		- Add imports (using magicstring)
//		- replace identifiers into script (using magicstring, needs list of searchStrings (printed from found nodes).)
// 3. Html:
//		- Replace identifiers into html (using magicstring, needs list of searchStrings (printed from found nodes).)
