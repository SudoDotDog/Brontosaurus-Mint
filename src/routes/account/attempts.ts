/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Attempts
 */

import { AccountNamespaceMatch, ApplicationCacheAgent, AttemptController, IAccountModel, IApplicationModel, IAttemptModel, INTERNAL_USER_GROUP, MatchController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE, panic } from "../../util/error";

export type FetchAccountAttemptsBody = {

    readonly username: string;
    readonly namespace: string;

    readonly page: number;
};

export type AccountAttemptElement = {

    readonly account: string;
    readonly succeed: boolean;
    readonly failedReason?: string;
    readonly platform: string;
    readonly userAgent: string;
    readonly target: string;
    readonly source: string;
    readonly proxySources: string[];
    readonly application: string;
    readonly identifier: string;
    readonly at: Date;
};

export class FetchAccountAttemptsRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/attempts';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/attempts - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/attempts - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), '/account/attempts - GroupVerifyHandler'),
        basicHook.wrap(this._fetchAccountAttemptsHandler.bind(this), '/account/attempts - Account Attempts'),
    ];

    private async _fetchAccountAttemptsHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FetchAccountAttemptsBody> = Safe.extract(req.body as FetchAccountAttemptsBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

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

            const pages: number = await AttemptController.getSelectedAccountAttemptPages(account._id, pageLimit);
            const attempts: IAttemptModel[] = await AttemptController.getAttemptsByAccountAndPage(account._id, pageLimit, Math.floor(page));

            const results: AccountAttemptElement[] = [];

            const applicationAgent: ApplicationCacheAgent = ApplicationCacheAgent.create();
            for (const attempt of attempts) {

                const currentApplication: IApplicationModel | null = await applicationAgent.getApplication(attempt.application);
                if (!currentApplication) {
                    throw panic.code(ERROR_CODE.APPLICATION_NOT_FOUND, attempt.application.toHexString());
                }

                results.push({
                    account: attempt.account.toHexString(),
                    succeed: attempt.succeed,
                    failedReason: attempt.failedReason,
                    platform: attempt.platform,
                    userAgent: attempt.userAgent,
                    target: attempt.target,
                    source: attempt.source,
                    proxySources: attempt.proxySources,
                    application: currentApplication.name,
                    identifier: attempt.identifier,
                    at: attempt.at,
                });
            }

            res.agent.add('attempts', results);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
