/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Generate Temporary Password
 */

import { IAccountModel, INTERNAL_USER_GROUP, MatchController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";
import { SafeToken } from "../../util/token";

export type AccountGenerateTemporaryPasswordBody = {

    readonly username: string;
    readonly namespace: string;
};

export class AccountGenerateTemporaryPasswordRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/generate-temporary-password';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/generate-temporary-password - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/generate-temporary-password - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), '/account/generate-temporary-password - GroupVerifyHandler'),
        basicHook.wrap(this._temporaryPasswordHandler.bind(this), '/account/generate-temporary-password - Generate Temporary Password'),
    ];

    private async _temporaryPasswordHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<AccountGenerateTemporaryPasswordBody> = Safe.extract(req.body as AccountGenerateTemporaryPasswordBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const token: SafeToken = req.principal;
            const requestUsername: string = token.body.directEnsure('username');
            const requestNamespace: string = token.body.directEnsure('namespace');

            const username: string = body.directEnsure('username');
            const namespace: string = body.directEnsure('namespace');

            const requestAccount: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(requestUsername, requestNamespace);

            if (!requestAccount) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, requestUsername);
            }

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(username, namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const expireDate = new Date();
            expireDate.setMonth(expireDate.getMonth() + 1);

            const password: string = account.generateTemporaryPassword(requestAccount._id, expireDate);

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
