import type { Node } from "estree";
import type { asyncWalk } from "estree-walker";
import { namedTypes as n, type ASTNode } from "ast-types";
import type { Ast } from "svelte/types/compiler/interfaces";

// This function cannot error.
export const findDeclarableIdentifier = async <AstType extends ASTNode | Ast>(
    ast: AstType,
    identifier: string,
    walker: typeof asyncWalk
) => {
    let newIdentifier: string | undefined;
    await walker(ast as Node, {
        async enter(node) {
            if (newIdentifier !== undefined) this.skip();
            else if (n.ImportDeclaration.check(node)) {
                for (const specifier of node.specifiers) {
                    if (
                        n.ImportSpecifier.check(specifier) &&
                        specifier.local.name === identifier
                    ) {
                        newIdentifier = await findDeclarableIdentifier(
                            ast,
                            `${identifier}_`,
                            walker
                        );
                        this.skip();
                    }
                }
            } else if (n.Identifier.check(node) && node.name === identifier) {
                newIdentifier = await findDeclarableIdentifier(
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
