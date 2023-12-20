import { types } from "recast";
import { CompoundStyles, Styles } from "../register";
import { walk as jsWalk } from "estree-walker";
import { BaseNode, Node } from "estree";
import type { PluginContext } from "rollup";
import { shortLibraryName } from "../library.config";
import { findDeclarableIdentifier } from "../ast/ast";
import { Ast, Attribute, Text } from "svelte/types/compiler/interfaces";
import { walk as svelteWalk } from "svelte/compiler";

const n = types.namedTypes;
const b = types.builders;

export function newEmittedFiles() {
    return new Map<string, Emitted>();
}

type Emitted = { styles: Styles | CompoundStyles; fileReference: string };
export type EmittedFiles = ReturnType<typeof newEmittedFiles>;

function templateLiteralValue(node: types.namedTypes.Node | Node | BaseNode) {
    // We are looking for a template literal with 0 expressions and
    if (
        n.TemplateLiteral.check(node) &&
        node.expressions.length === 0 &&
        node.quasis.length === 1 &&
        n.TemplateElement.check(node.quasis[0])
    ) {
        return {
            start: node.start as number,
            end: node.end as number,
            raw: `\`${node.quasis[0].value.raw}\``,
            value: node.quasis[0].value.raw,
            type: "template" as const,
        };
    }
    return undefined;
}

function nodeIsAttribute(node: BaseNode): node is Attribute {
    return node.type === "Attribute";
}

function nodeIsText(node: BaseNode): node is Text {
    return node.type === "Text";
}

function attributeTextValue(node: BaseNode) {
    if (nodeIsAttribute(node) && nodeIsText(node.value[0]))
        return {
            start: node.start,
            end: node.end,
            raw: node.value[0].data,
            value: node.value[0].data,
            type: "attribute" as const,
            name: node.name,
        };
    return undefined;
}

type SearchResult = {
    start: number;
    end: number;
    raw: string;
    value: string;
} & (
    | {
          type: "template" | "literal";
      }
    | {
          type: "attribute";
          name: string;
      }
);

function runOnSearchResult(
    node: Node | types.namedTypes.Node | BaseNode,
    runOn: (searchResult: SearchResult) => void
) {
    const element = n.Literal.check(node)
        ? typeof node.value === "string" && node.raw != undefined
            ? {
                  start: node.start as number,
                  end: node.end as number,
                  raw: node.raw,
                  value: node.value,
                  type: "literal" as const,
              }
            : undefined
        : templateLiteralValue(node) ?? attributeTextValue(node);
    if (element != undefined) runOn(element);
}

/* code: the code of the page to inject into */
/* registrations: the user provided registrations */
/* emittedIdentifiers: the identifiers already processed and placed in the emitted file */
export function analyzeJsSvelte<
    AstType extends types.namedTypes.Node | Node | Ast,
>(
    ast: AstType,
    registrations: (Styles | CompoundStyles)[],
    emittedFiles: EmittedFiles,
    rollupPluginContext: PluginContext,
    walker: AstType extends types.namedTypes.Node | Node
        ? typeof jsWalk
        : typeof svelteWalk
) {
    // Imports to add
    const importsToAdd = new Map<string, string>();
    const elementsToReplace: ({
        declarableIdentifier: string;
    } & SearchResult)[] = [];

    // Find and replace occurences of identifiers
    walker(ast as Node, {
        enter(node: BaseNode) {
            // 1. Check whether it is the right node type
            // 2. If yes, Check for a match

            runOnSearchResult(node, literal => {
                const matchingRegistration = registrations.find(r => {
                    return r.matchDescription(literal.value);
                });
                // 3. If matching
                if (matchingRegistration) {
                    const identifier = matchingRegistration.getIdentifier(
                        literal.value
                    );
                    const declarableIdentifier = findDeclarableIdentifier(
                        ast as Node,
                        identifier,
                        walker
                    );
                    const ref =
                        emittedFiles.get(identifier)?.fileReference ??
                        rollupPluginContext.emitFile({
                            type: "chunk",
                            id: `${shortLibraryName}-${identifier}`,
                        });
                    emittedFiles.set(identifier, {
                        styles: matchingRegistration,
                        fileReference: ref,
                    });
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
