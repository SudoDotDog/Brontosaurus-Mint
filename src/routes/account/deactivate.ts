/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Deactivate
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type AccountDeactivateBody = {

    readonly username: string;
};

export class AccountDeactivateRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/deactivate';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/deactivate - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/deactivate - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/deactivate - GroupVerifyHandler'),
        basicHook.wrap(this._deactivateHandler.bind(this), '/account/deactivate - Deactivate', true),
    ];

    private async _deactivateHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<AccountDeactivateBody> = Safe.extract(req.body as AccountDeactivateBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const username: string = body.directEnsure('username');

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            account.active = false;
            await account.save();

            res.agent.add('deactivated', account.username);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
