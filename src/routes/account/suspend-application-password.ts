/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Suspend Application Password
 */

import { IAccountModel, INTERNAL_USER_GROUP, MatchController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";
import { SafeToken } from "../../util/token";

export type AccountSuspendApplicationPasswordBody = {

    readonly username: string;
    readonly namespace: string;
    readonly passwordId: string;
};

export class AccountSuspendApplicationPasswordRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/suspend-application-password';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'GroupVerifyHandler'),
        autoHook.wrap(this._applicationPasswordHandler.bind(this), 'Suspend Application Password'),
    ];

    private async _applicationPasswordHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<AccountSuspendApplicationPasswordBody> = Safe.extract(req.body as AccountSuspendApplicationPasswordBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const token: SafeToken = req.principal;
            const username: string = body.directEnsure('username');
            const namespace: string = body.directEnsure('namespace');
            const passwordId: string = body.directEnsure('passwordId');

            const requestUsername: string = token.body.directEnsure('username');
            const requestNamespace: string = token.body.directEnsure('namespace');

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

            const result: boolean = account.suspendApplicationPassword(passwordId, requestAccount._id);

            if (!result) {
                throw panic.code(ERROR_CODE.APPLICATION_PASSWORD_NOT_EXIST, passwordId);
            }

            await account.save();

            res.agent.add('username', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
