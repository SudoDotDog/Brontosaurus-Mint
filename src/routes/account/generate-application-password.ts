/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Generate Application Password
 */

import { IAccountModel, INTERNAL_USER_GROUP, MatchController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";
import { SafeToken } from "../../util/token";

export type AccountGenerateApplicationPasswordBody = {

    readonly username: string;
    readonly namespace: string;
};

export const bodyPattern: Pattern = createStrictMapPattern({

    username: createStringPattern(),
    namespace: createStringPattern(),
});

export class AccountGenerateApplicationPasswordRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/generate-application-password';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'GroupVerifyHandler'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._applicationPasswordHandler.bind(this), 'Generate Application Password'),
    ];

    private async _applicationPasswordHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: AccountGenerateApplicationPasswordBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const token: SafeToken = req.principal;
            const requestUsername: string = token.body.directEnsure('username');
            const requestNamespace: string = token.body.directEnsure('namespace');

            const requestAccount: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(requestUsername, requestNamespace);

            if (!requestAccount) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, requestUsername);
            }

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(body.username, body.namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, body.username);
            }

            const expireDate = new Date();
            expireDate.setMonth(expireDate.getMonth() + 1);

            const password: string = account.generateApplicationPassword(requestAccount._id, expireDate);

            await account.save();

            res.agent.add('username', account.username);
            res.agent.add('password', password);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
