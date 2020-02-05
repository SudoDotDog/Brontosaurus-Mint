/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Generate Temporary Password
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type AccountGenerateTemporaryPasswordBody = {

    readonly username: string;
};

export class AccountGenerateTemporaryPasswordRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/generate-temporary-password';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/generate-temporary-password - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/generate-temporary-password - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/generate-temporary-password - GroupVerifyHandler'),
        basicHook.wrap(this._temporaryPasswordHandler.bind(this), '/account/generate-temporary-password - Generate Temporary Password'),
    ];

    private async _temporaryPasswordHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<AccountGenerateTemporaryPasswordBody> = Safe.extract(req.body as AccountGenerateTemporaryPasswordBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            await account.save();

            res.agent.add('x', '');
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
