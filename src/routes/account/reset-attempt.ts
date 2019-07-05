/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Reset Attempt
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";
import { ERROR_CODE } from "../../util/error";

export type ResetAttemptBody = {

    readonly username: string;
};

export class ResetAttemptRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/reset-attempt';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/reset-attempt - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/reset-attempt - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/reset-attempt - GroupVerifyHandler'),
        basicHook.wrap(this._resetAttemptHandler.bind(this), '/account/reset-attempt - Reset Attempt', true),
    ];

    private async _resetAttemptHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<ResetAttemptBody> = Safe.extract(req.body as ResetAttemptBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const username: string = body.directEnsure('username');

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            account.resetAttempt();

            await account.save();

            res.agent.add('attempt', account.attemptPoints);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
