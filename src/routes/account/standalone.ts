/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Standalone
 */

import { AccountController, IAccountModel, INamespaceModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createIntegerPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { getNamespaceMapByNamespaceIds } from "../../data/namespace";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE, panic } from "../../util/error";

export type FetchStandaloneAccountBody = {

    readonly page: number;
    readonly keyword: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    keyword: createStringPattern(),
    page: createIntegerPattern({
        maximum: 0,
    }),
});

export class FetchStandaloneAccountRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/standalone';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._fetchStandaloneAccountHandler.bind(this), 'Standalone Fetch'),
    ];

    private async _fetchStandaloneAccountHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: FetchStandaloneAccountBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const pages: number = await AccountController.getStandaloneAcitveAccountPagesByKeyword(
                pageLimit,
                body.keyword,
            );
            const accounts: IAccountModel[] = await AccountController.getStandaloneActiveAccountsByPage(
                body.keyword,
                pageLimit,
                body.page,
            );

            const namespaceMap: Map<string, INamespaceModel> = await getNamespaceMapByNamespaceIds(accounts.map((each) => each.namespace));

            const parsed = accounts.map((account: IAccountModel) => ({
                username: account.username,
                namespace: namespaceMap.get(account.namespace.toHexString())?.namespace,
                email: account.email,
                phone: account.phone,
                twoFA: Boolean(account.twoFA),
                groups: account.groups.length,
            }));

            res.agent.add('accounts', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
