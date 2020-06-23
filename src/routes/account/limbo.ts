/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Limbo
 */

import { IAccountModel, INTERNAL_USER_GROUP, MatchController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { createRandomTempPassword } from "../../util/auth";
import { ERROR_CODE } from "../../util/error";

export type AccountLimboBody = {

    readonly username: string;
    readonly namespace: string;
};

export class AccountLimboRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/limbo';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/limbo - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/limbo - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), '/account/limbo - GroupVerifyHandler'),
        basicHook.wrap(this._limboHandler.bind(this), '/account/limbo - Limbo'),
    ];

    private async _limboHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<AccountLimboBody> = Safe.extract(req.body as AccountLimboBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');
            const namespace: string = body.directEnsure('namespace');

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(username, namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const tempPassword: string = createRandomTempPassword();
            account.limbo = true;
            account.setPassword(tempPassword, 'temp');
            account.resetAttempt();

            await account.save();

            res.agent.add('limbo', account.limbo);
            res.agent.add('tempPassword', tempPassword);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
