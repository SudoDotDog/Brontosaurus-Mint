/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Verify Previous Password
 */

import { IAccountModel, INTERNAL_USER_GROUP, MatchController, PreviousPassword } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type VerifyPreviousPasswordBody = {

    readonly username: string;
    readonly namespace: string;
    readonly password: string;
};

export class VerifyPreviousPasswordRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/verify-previous-password';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/verify-previous-password - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/verify-previous-password - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), '/account/verify-previous-password - GroupVerifyHandler'),
        basicHook.wrap(this._verifyPreviousPasswordHandler.bind(this), '/account/verify-previous-password - Verify Previous Password'),
    ];

    private async _verifyPreviousPasswordHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<VerifyPreviousPasswordBody> = Safe.extract(req.body as VerifyPreviousPasswordBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');
            const namespace: string = body.directEnsure('namespace');
            const password: string = body.directEnsure('password');

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(username, namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const previousPassword: PreviousPassword | null = account.verifyPreviousPassword(password);

            if (previousPassword) {
                res.agent.add('previousPassword', previousPassword);
            } else {
                res.agent.add('previousPassword', null);
            }

            res.agent.add('account', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
