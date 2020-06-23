/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Standalone
 */

import { AccountController, IAccountModel, INamespaceModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { getNamespaceMapByNamespaceIds } from "../../data/namespace";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE } from "../../util/error";

export type FetchStandaloneAccountBody = {

    readonly page: number;
    readonly keyword: string;
};

export class FetchStandaloneAccountRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/standalone';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'GroupVerifyHandler'),
        autoHook.wrap(this._fetchStandaloneAccountHandler.bind(this), 'Standalone Fetch'),
    ];

    private async _fetchStandaloneAccountHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FetchStandaloneAccountBody> = Safe.extract(req.body as FetchStandaloneAccountBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const page: number = body.direct('page');
            if (typeof page !== 'number' || page < 0) {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'page', 'number', (page as any).toString());
            }

            const keyword: string = body.direct('keyword');
            if (typeof keyword !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'keyword', 'string', (keyword as any).toString());
            }

            const pages: number = await AccountController.getStandaloneAcitveAccountPagesByKeyword(pageLimit, keyword);
            const accounts: IAccountModel[] = await AccountController.getStandaloneActiveAccountsByPage(keyword, pageLimit, Math.floor(page));

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
