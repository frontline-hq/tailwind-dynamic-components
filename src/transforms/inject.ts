import {
    CompoundStyles,
    Styles,
    variantDescriptionDelimiter,
} from "../register";
import type { walk as jsWalk } from "estree-walker";
import { Node } from "estree";
import { shortLibraryName } from "../library.config";
import { findDeclarableIdentifier } from "../ast/ast";
import { Ast, Attribute, Text } from "svelte/types/compiler/interfaces";
import { walk as svelteWalk } from "svelte/compiler";
import { flattenAndCheckRegistrations } from "../config/config";
import { ASTNode, namedTypes as n } from "ast-types";

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

function runOnSearchResult(
    node: ASTNode,
    runOn: (searchResult: SearchResult) => void
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
    if (element != undefined) runOn(element);
}

/* code: the code of the page to inject into */
/* registrations: the user provided registrations */
/* emittedIdentifiers: the identifiers already processed and placed in the emitted file */
export function analyzeJsSvelte<AstType extends ASTNode | Ast>(
    ast: AstType,
    registrations: (Styles | CompoundStyles)[],
    emittedFiles: EmittedFiles,
    walker: AstType extends ASTNode ? typeof jsWalk : typeof svelteWalk
) {
    // Imports to add
    const importsToAdd = new Map<string, string>();
    const elementsToReplace: ({
        declarableIdentifier: string;
    } & SearchResult)[] = [];

    const completeRegistrations = flattenAndCheckRegistrations(registrations);

    // Find and replace occurences of identifiers
    walker(ast as Node, {
        enter(node: ASTNode) {
            // 1. Check whether it is the right node type
            // 2. If yes, Check for a match

            runOnSearchResult(node, literal => {
                const matchingRegistration = completeRegistrations.find(r => {
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
                    const declarableIdentifier = findDeclarableIdentifier(
                        ast,
                        identifier,
                        walker
                    );
                    const ref = getFileName(identifier);
                    emittedFiles.set(identifier, {
                        styles: matchingRegistration.compile(
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
