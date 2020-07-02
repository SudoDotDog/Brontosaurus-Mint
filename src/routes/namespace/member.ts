/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Namespace
 * @description Member
 */

import { AccountController, IAccount, INamespaceModel, INTERNAL_USER_GROUP, NamespaceController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createNumberPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE, panic } from "../../util/error";

export type NamespaceFetchMemberBody = {

    readonly namespace: string;
    readonly page: number;
};

export const bodyPattern: Pattern = createStrictMapPattern({

    namespace: createStringPattern(),
    page: createNumberPattern({
        integer: true,
        minimum: 0,
    }),
});

export class NamespaceFetchMemberRoute extends BrontosaurusRoute {

    public readonly path: string = '/namespace/members';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'GroupVerifyHandler'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._namespaceFetchMemberHandler.bind(this), 'Fetch Namespace Member'),
    ];

    private async _namespaceFetchMemberHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: NamespaceFetchMemberBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const decoded: string = decodeURIComponent(body.namespace);
            const namespace: INamespaceModel | null = await NamespaceController.getNamespaceByNamespace(decoded);
            if (!namespace) {
                throw this._error(ERROR_CODE.NAMESPACE_NOT_FOUND, body.namespace);
            }

            const accounts: IAccount[] = await AccountController.getAccountsByNamespaceAndPageLean(namespace._id, pageLimit, body.page);
            const pages: number = await AccountController.getAccountsByNamespacePages(namespace._id, pageLimit);

            res.agent.add('pages', pages);
            res.agent.add('members', accounts.map((member: IAccount) => ({
                active: member.active,
                username: member.username,
                namespace: namespace.namespace,
                displayName: member.displayName,
                phone: member.phone,
                email: member.email,
            })));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
