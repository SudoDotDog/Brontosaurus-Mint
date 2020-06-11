/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Fetch
 */

import { AccountController, AttemptController, IAccountModel, INamespaceModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { getNamespaceMapByNamespaceIds } from "../../data/namespace";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE } from "../../util/error";

export type FetchAccountBody = {

    readonly page: number;
    readonly keyword: string;
};

export class FetchAccountRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/fetch - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/fetch - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), '/account/fetch - GroupVerifyHandler'),
        basicHook.wrap(this._fetchAccountHandler.bind(this), '/account/fetch - Fetch'),
    ];

    private async _fetchAccountHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FetchAccountBody> = Safe.extract(req.body as FetchAccountBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

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

            const pages: number = await AccountController.getSelectedAccountPages(pageLimit, keyword);
            const accounts: IAccountModel[] = await AccountController.getSelectedAccountsByPage(pageLimit, Math.floor(page), keyword);

            const namespaceMap: Map<string, INamespaceModel> = await getNamespaceMapByNamespaceIds(accounts.map((each) => each.namespace));
            const result: any[] = [];

            for (const account of accounts) {

                const attempts: number = await AttemptController.getAttemptCountByAccount(account._id);
                result.push({
                    active: account.active,
                    attempts,
                    username: account.username,
                    namespace: namespaceMap.get(account.namespace.toHexString())?.namespace,
                    displayName: account.displayName,
                    email: account.email,
                    phone: account.phone,
                    twoFA: Boolean(account.twoFA),
                    groups: account.groups.length,
                    decorators: account.decorators.length,
                    tags: account.tags.length,
                    infos: account.getInfoRecords(),
                });
            }

            res.agent.add('accounts', result);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
