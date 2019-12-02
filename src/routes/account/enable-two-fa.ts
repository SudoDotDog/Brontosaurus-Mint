/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Enable Two FA
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import * as QRCode from "qrcode";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";
import { SafeToken } from "../../util/token";

export type EnableTwoFABody = {

    readonly username: string;
};

export class EnableTwoFARoute extends BrontosaurusRoute {

    public readonly path: string = '/account/self/enable-2fa';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/self/enable-2fa - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/self/enable-2fa - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SELF_CONTROL], this._error), '/account/self/enable-2fa - GroupVerifyHandler'),
        basicHook.wrap(this._enableTwoFAHandler.bind(this), '/account/self/enable-2fa - Enable Two FA', true),
    ];

    private async _enableTwoFAHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<EnableTwoFABody> = Safe.extract(req.body as EnableTwoFABody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

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
