/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Flats_Account
 * @description Enable Two FA
 */

import { IAccountModel, INTERNAL_USER_GROUP, MatchController, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import * as QRCode from "qrcode";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";
import { SafeToken } from "../../util/token";

export type FlatEnableTwoFABody = {

    readonly username: string;
    readonly namespace: string;
};

export class FlatEnableTwoFARoute extends BrontosaurusRoute {

    public readonly path: string = '/flat/account/enable-2fa';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/flat/account/enable-2fa - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/flat/account/enable-2fa - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SELF_CONTROL]), '/flat/account/enable-2fa - GroupVerifyHandler'),
        basicHook.wrap(this._flatEnableTwoFAHandler.bind(this), '/flat/account/enable-2fa - Enable Two FA'),
    ];

    private async _flatEnableTwoFAHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FlatEnableTwoFABody> = Safe.extract(req.body as FlatEnableTwoFABody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');
            const namespace: string = body.directEnsure('namespace');
            const principal: SafeToken = req.principal;

            const tokenUsername: string = principal.body.directEnsure('username', this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_INFORMATION, 'username'));
            const tokenNamespace: string = principal.body.directEnsure('namespace', this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_INFORMATION, 'namespace'));

            if (username !== tokenUsername) {
                throw this._error(ERROR_CODE.PERMISSION_USER_DOES_NOT_MATCH, username, tokenUsername);
            }

            if (namespace !== tokenNamespace) {
                throw this._error(ERROR_CODE.PERMISSION_NAMESPACE_DOES_NOT_MATCH, namespace, tokenNamespace);
            }

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(username, namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const systemName: string | null = await PreferenceController.getSinglePreference('systemName');

            const secretURL: string = account.generateAndSetTwoFA(systemName || 'Brontosaurus Authorization');
            const qrcode: string = await QRCode.toDataURL(secretURL);
            account.resetMint();
            account.resetAttempt();

            await account.save();

            res.agent.add('secret', secretURL);
            res.agent.add('qrcode', qrcode);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
