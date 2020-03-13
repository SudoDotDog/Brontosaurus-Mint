/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Flats_Account
 * @description Change Password
 */

import { IAccountModel, INTERNAL_USER_GROUP, MatchController, PASSWORD_VALIDATE_RESPONSE, validatePassword } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";
import { SafeToken } from "../../util/token";

export type FlatChangePasswordBody = {

    username: string;
    namespace: string;
    password: string;
};

export class FlatChangePasswordRoute extends BrontosaurusRoute {

    public readonly path: string = '/flat/account/edit/password';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/flat/account/edit/password - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/flat/account/edit/password - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SELF_CONTROL], this._error), '/flat/account/edit/password - GroupVerifyHandler'),
        basicHook.wrap(this._flatChangePasswordHandler.bind(this), '/flat/account/edit/password - Change Password'),
    ];

    private async _flatChangePasswordHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FlatChangePasswordBody> = Safe.extract(req.body as FlatChangePasswordBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');
            const namespace: string = body.directEnsure('namespace');
            const password: string = body.direct('password');
            const principal: SafeToken = req.principal;

            const tokenUsername: string = principal.body.directEnsure('username', this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_INFORMATION, 'username'));
            const tokenNamespace: string = principal.body.directEnsure('namespace', this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_INFORMATION, 'namespace'));

            if (username !== tokenUsername) {
                throw this._error(ERROR_CODE.PERMISSION_USER_DOES_NOT_MATCH, username, tokenUsername);
            }

            if (namespace !== tokenNamespace) {
                throw this._error(ERROR_CODE.PERMISSION_NAMESPACE_DOES_NOT_MATCH, namespace, tokenNamespace);
            }

            const validateResult: PASSWORD_VALIDATE_RESPONSE = validatePassword(password);

            if (validateResult !== PASSWORD_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_PASSWORD, validateResult);
            }

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(username, namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            account.setPassword(password);
            account.resetAttempt();

            await account.save();

            res.agent.add('account', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
