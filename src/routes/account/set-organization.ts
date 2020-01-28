/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Set Organization
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type SetOrganizationBody = {

    username: string;
    organization: string;
};

export class SetOrganizationRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/set-organization';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/set-organization - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/set-organization - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/set-organization - GroupVerifyHandler'),
        basicHook.wrap(this._setOrganizationHandler.bind(this), '/account/set-organization - Set Organization'),
    ];

    private async _setOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<SetOrganizationBody> = Safe.extract(req.body as SetOrganizationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');
            const organizationName: string = body.directEnsure('organization');

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            if (account.organization) {
                const currentOrganization: IOrganizationModel | null = await OrganizationController.getOrganizationById(account.organization);

                if (!currentOrganization) {
                    throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, account.organization.toHexString());
                }

                if (currentOrganization.owner.equals(account._id)) {
                    throw this._error(ERROR_CODE.CANNOT_WITHDRAW_OWNER);
                }
            }

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(organizationName);

            if (!organization) {
                throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, organizationName);
            }

            account.organization = organization._id;
            account.resetMint();

            await account.save();

            res.agent.add('account', account.username);
            res.agent.add('organization', organization.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
