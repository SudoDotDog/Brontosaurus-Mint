/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Red_Account
 * @description Remove Two FA
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";
import { ERROR_CODE } from "../../util/error";

export type RemoveTwoFABody = {

    readonly username: string;
};

export class RemoveTwoFARoute extends BrontosaurusRoute {

    public readonly path: string = '/account/remove-2fa';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/remove-2fa - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/remove-2fa - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/remove-2fa - GroupVerifyHandler'),
        basicHook.wrap(this._removeTwoFAHandler.bind(this), '/account/remove-2fa - Remove Two FA', true),
    ];

    private async _removeTwoFAHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<RemoveTwoFABody> = Safe.extract(req.body as RemoveTwoFABody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const username: string = body.directEnsure('username');

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            account.twoFA = undefined;
            await account.save();

            res.agent.add('removed', account.username);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
