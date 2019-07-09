/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Withdraw Organization
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { _Random } from "@sudoo/bark/random";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type WithdrawOrganizationBody = {

    readonly username: string;
};

export class WithdrawOrganizationRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/withdraw-organization';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/withdraw-organization - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/withdraw-organization - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/withdraw-organization - GroupVerifyHandler'),
        basicHook.wrap(this._withdrawOrganizationHandler.bind(this), '/account/withdraw-organization - Withdraw Organization', true),
    ];

    private async _withdrawOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<WithdrawOrganizationBody> = Safe.extract(req.body as WithdrawOrganizationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const username: string = body.directEnsure('username');

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            account.organization = undefined;

            await account.save();

            res.agent.add('withdraw', account.username);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
