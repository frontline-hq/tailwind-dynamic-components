import { Registration, whitespaceCharsRegex } from "../register";
import { asyncWalk } from "estree-walker";
import type { Node } from "estree";
import { shortLibraryName } from "../library.config";
import { findDeclarableIdentifier } from "../ast/ast";
import type {
    Ast,
    Attribute,
    MustacheTag,
} from "svelte/types/compiler/interfaces";
import { parse } from "svelte/compiler";
import type { ASTNode } from "ast-types";
import MagicString from "magic-string";
import {
    findMatchingRegistrations,
    nodeIsAttribute,
    nodeIsElement,
    nodeIsMustacheTag,
    nodeIsObjectExpression,
    resolveComponentName,
} from "../utils";
import { getConfigFilePath } from "../config/config";

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

    const ast: Ast = parse(markup);

    await asyncWalk(ast as unknown as Node, {
        async enter(node: ASTNode) {
            if (nodeIsElement(node)) {
                const componentName = resolveComponentName(
                    node.name,
                    tagNameDelimiter
                );
                if (componentName !== undefined) {
                    const { registration: matchingRegistration, path } =
                        findMatchingRegistrations(
                            node.name.substring(
                                shortLibraryName.length +
                                    tagNameDelimiter.length
                            ),
                            /* getLibraryConfig(). */ registrations,
                            tagNameDelimiter
                        ) ?? {};
                    if (matchingRegistration && path) {
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
                            // The string of the whole component in the markup: "<tdc-button tdc={{}}>...</tdc-button>"
                            const s = new MagicString(
                                markup.slice(node.start, node.end)
                            );
                            let tdcReplacement;
                            try {
                                // compile with found props
                                const evalResult = (0, eval)(
                                    "(" + evalString + ")"
                                );
                                tdcReplacement = JSON.stringify(
                                    matchingRegistration.compile(evalResult)
                                );
                            } catch (error) {
                                // eval fails
                                // Add config file to imports
                                const configImportName = `${shortLibraryName}Config`;
                                const declarableConfigName =
                                    await findDeclarableIdentifier(
                                        ast,
                                        configImportName,
                                        asyncWalk
                                    );
                                importsToAdd.set(
                                    `default as ${declarableConfigName}`,
                                    getConfigFilePath()
                                );
                                // Inject runtime compile.
                                tdcReplacement = `${declarableConfigName}.registrations${path.map(
                                    p => `["${String(p)}"]`
                                )}.compile(${evalString}, "${evalString}")`;
                            }
                            // Replace compiled result
                            s.update(
                                libraryAttributeExpression.start - node.start,
                                libraryAttributeExpression.end - node.end,
                                tdcReplacement
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
    };
}
