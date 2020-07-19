/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Resets
 */

import { AccountNamespaceMatch, ApplicationCacheAgent, IAccountModel, IApplicationModel, INTERNAL_USER_GROUP, IResetModel, MatchController, ResetController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createIntegerPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE, panic } from "../../util/error";

export type FetchAccountResetsBody = {

    readonly username: string;
    readonly namespace: string;

    readonly page: number;
};

const bodyPattern: Pattern = createStrictMapPattern({

    username: createStringPattern(),
    namespace: createStringPattern(),

    page: createIntegerPattern({
        maximum: 0,
    }),
});

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
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._fetchAccountResetsHandler.bind(this), 'Account Resets'),
    ];

    private async _fetchAccountResetsHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: FetchAccountResetsBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const decoded: string = decodeURIComponent(body.username);
            const matchResult: AccountNamespaceMatch = await MatchController.getAccountNamespaceMatchByUsernameAndNamespace(decoded, body.namespace);
            if (matchResult.succeed === false) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, decoded);
            }

            const account: IAccountModel = matchResult.account;

            const pages: number = await ResetController.getSelectedAccountResetPages(account._id, pageLimit);
            const resets: IResetModel[] = await ResetController.getResetsByAccountAndPage(account._id, pageLimit, body.page);

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
