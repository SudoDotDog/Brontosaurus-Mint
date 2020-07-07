/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Withdraw Organization
 */

import { IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, MatchController, OrganizationController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type WithdrawOrganizationBody = {

    readonly username: string;
    readonly namespace: string;
};

export class WithdrawOrganizationRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/withdraw-organization';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(this._withdrawOrganizationHandler.bind(this), 'Withdraw Organization'),
    ];

    private async _withdrawOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<WithdrawOrganizationBody> = Safe.extract(req.body as WithdrawOrganizationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

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

            if (!account.organization) {
                res.agent.add('withdraw', account.username);
                return;
            }

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationById(account.organization);

            if (!organization) {
                throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, account.organization.toHexString());
            }

            if (organization.owner.equals(account._id)) {
                throw this._error(ERROR_CODE.CANNOT_WITHDRAW_OWNER);
            }

            account.organization = undefined;
            account.resetMint();

            await account.save();

            res.agent.add('withdraw', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
