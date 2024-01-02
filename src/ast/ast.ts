import type { Node } from "estree";
import type { walk as jsWalk } from "estree-walker";
import { namedTypes as n, type ASTNode } from "ast-types";
import { Ast } from "svelte/types/compiler/interfaces";
import type { walk as svelteWalk } from "svelte/compiler";

// This function cannot error.
export const findDeclarableIdentifier = <AstType extends ASTNode | Ast>(
    ast: AstType,
    identifier: string,
    walker: AstType extends ASTNode ? typeof jsWalk : typeof svelteWalk
) => {
    let newIdentifier: string | undefined;
    walker(ast as Node, {
        enter(node) {
            if (newIdentifier !== undefined) this.skip();
            else if (n.ImportDeclaration.check(node)) {
                for (const specifier of node.specifiers) {
                    if (
                        n.ImportSpecifier.check(specifier) &&
                        specifier.local.name === identifier
                    ) {
                        newIdentifier = findDeclarableIdentifier(
                            ast,
                            `${identifier}_`,
                            walker
                        );
                        this.skip();
                    }
                }
            } else if (n.Identifier.check(node) && node.name === identifier) {
                newIdentifier = findDeclarableIdentifier(
                    ast,
                    `${identifier}_`,
                    walker
                );
                this.skip();
            }
        },
    });
    return newIdentifier === undefined ? identifier : newIdentifier;
};
