/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Standalone
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE } from "../../util/error";

export type FetchStandaloneAccountBody = {

    page: number;
    keyword: string;
};

export class FetchStandaloneAccountRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/standalone';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/standalone - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/standalone - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/standalone - GroupVerifyHandler'),
        basicHook.wrap(this._fetchStandaloneAccountHandler.bind(this), '/account/standalone - Standalone Fetch', true),
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

            const parsed = accounts.map((account: IAccountModel) => ({
                username: account.username,
                email: account.email,
                phone: account.phone,
                twoFA: Boolean(account.twoFA),
                groups: account.groups.length,
            }));

            res.agent.add('accounts', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
