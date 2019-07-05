/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Change Password
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";
import { SafeToken } from "../../util/token";
import { BrontosaurusRoute } from "../basic";

export type ChangePasswordBody = {

    username: string;
    password: string;
};

export class ChangePasswordRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/edit/password';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/edit/password - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/edit/password - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SELF_CONTROL], this._error), '/account/edit/password - GroupVerifyHandler'),
        basicHook.wrap(this._changePasswordHandler.bind(this), '/account/edit/password - Change Password', true),
    ];

    private async _changePasswordHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<ChangePasswordBody> = Safe.extract(req.body as ChangePasswordBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const username: string = body.directEnsure('username');
            const principal: SafeToken = req.principal;

            const tokenUsername: string = principal.body.directEnsure('username', this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_INFORMATION, 'username'));

            if (username !== tokenUsername) {
                throw this._error(ERROR_CODE.PERMISSION_USER_DOES_NOT_MATCH, username, tokenUsername);
            }

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const password: string = body.direct('password');
            account.setPassword(password);
            account.resetAttempt();

            await account.save();

            res.agent.add('account', account.username);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
