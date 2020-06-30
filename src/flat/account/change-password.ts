/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Flats_Account
 * @description Change Password
 */

import { IAccountModel, INTERNAL_USER_GROUP, MatchController, PASSWORD_VALIDATE_RESPONSE, validatePassword } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";
import { SafeToken } from "../../util/token";

export type FlatChangePasswordBody = {

    readonly username: string;
    readonly namespace: string;
    readonly password: string;
};

export const bodyPattern: Pattern = createStrictMapPattern({

    username: createStringPattern(),
    namespace: createStringPattern(),
    password: createStringPattern(),
});

export class FlatChangePasswordRoute extends BrontosaurusRoute {

    public readonly path: string = '/flat/account/edit/password';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SELF_CONTROL]), 'GroupVerifyHandler'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._flatChangePasswordHandler.bind(this), 'Change Password'),
    ];

    private async _flatChangePasswordHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: FlatChangePasswordBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const principal: SafeToken = req.principal;

            const tokenUsername: string = principal.body.directEnsure('username', this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_INFORMATION, 'username'));
            const tokenNamespace: string = principal.body.directEnsure('namespace', this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_INFORMATION, 'namespace'));

            if (body.username !== tokenUsername) {
                throw this._error(ERROR_CODE.PERMISSION_USER_DOES_NOT_MATCH, body.username, tokenUsername);
            }

            if (body.namespace !== tokenNamespace) {
                throw this._error(ERROR_CODE.PERMISSION_NAMESPACE_DOES_NOT_MATCH, body.namespace, tokenNamespace);
            }

            const validateResult: PASSWORD_VALIDATE_RESPONSE = validatePassword(body.password);

            if (validateResult !== PASSWORD_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_PASSWORD, validateResult);
            }

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(body.username, body.namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, body.username);
            }

            account.setPassword(body.password, 'change');
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
