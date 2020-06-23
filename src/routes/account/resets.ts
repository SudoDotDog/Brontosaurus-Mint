/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Resets
 */

import { AccountNamespaceMatch, ApplicationCacheAgent, IAccountModel, IApplicationModel, INTERNAL_USER_GROUP, IResetModel, MatchController, ResetController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE, panic } from "../../util/error";

export type FetchAccountResetsBody = {

    readonly username: string;
    readonly namespace: string;

    readonly page: number;
};

export type AccountResetElement = {

    readonly account: string;
    readonly succeed: boolean;
    readonly emailUsed: string;
    readonly emailExpected: string;
    readonly platform: string;
    readonly userAgent: string;
    readonly target: string;
    readonly source: string;
    readonly proxySources: string[];
    readonly application: string;
    readonly identifier: string;
    readonly at: Date;
};

export class FetchAccountResetsRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/resets';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/resets - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/resets - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), '/account/resets - GroupVerifyHandler'),
        basicHook.wrap(this._fetchAccountResetsHandler.bind(this), '/account/resets - Account Resets'),
    ];

    private async _fetchAccountResetsHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FetchAccountResetsBody> = Safe.extract(req.body as FetchAccountResetsBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');
            const namespace: string = body.directEnsure('namespace');

            const page: number = body.direct('page');
            if (typeof page !== 'number' || page < 0) {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'page', 'number', (page as any).toString());
            }

            if (typeof username !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'username', 'string', (username as any).toString());
            }

            if (typeof namespace !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'namespace', 'string', (namespace as any).toString());
            }

            const decoded: string = decodeURIComponent(username);
            const matchResult: AccountNamespaceMatch = await MatchController.getAccountNamespaceMatchByUsernameAndNamespace(decoded, namespace);
            if (matchResult.succeed === false) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const account: IAccountModel = matchResult.account;

            const pages: number = await ResetController.getSelectedAccountResetPages(account._id, pageLimit);
            const resets: IResetModel[] = await ResetController.getResetsByAccountAndPage(account._id, pageLimit, Math.floor(page));

            const results: AccountResetElement[] = [];

            const applicationAgent: ApplicationCacheAgent = ApplicationCacheAgent.create();
            for (const reset of resets) {

                const currentApplication: IApplicationModel | null = await applicationAgent.getApplication(reset.application);
                if (!currentApplication) {
                    throw panic.code(ERROR_CODE.APPLICATION_NOT_FOUND, reset.application.toHexString());
                }

                results.push({
                    account: reset.account.toHexString(),
                    succeed: reset.succeed,
                    emailUsed: reset.emailUsed,
                    emailExpected: reset.emailExpected,
                    platform: reset.platform,
                    userAgent: reset.userAgent,
                    target: reset.target,
                    source: reset.source,
                    proxySources: reset.proxySources,
                    application: currentApplication.name,
                    identifier: reset.id.toString(),
                    at: reset.at,
                });
            }

            res.agent.add('resets', results);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
