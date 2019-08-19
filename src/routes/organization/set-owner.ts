/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Set Owner
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { ObjectID } from "bson";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type SetOwnerBody = {

    username: string;
    organization: string;
};

export class SetOwnerRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/set-owner';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/set-owner - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/set-owner - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/organization/set-owner - GroupVerifyHandler'),
        basicHook.wrap(this._setOwnerHandler.bind(this), '/organization/set-owner - Set Owner', true),
    ];

    private async _setOwnerHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<SetOwnerBody> = Safe.extract(req.body as SetOwnerBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const username: string = body.directEnsure('username');
            const organizationName: string = body.directEnsure('organization');

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(organizationName);

            if (!organization) {
                throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, organizationName);
            }

            const organizationID: ObjectID = organization._id;

            if (!account.organization) {
                throw this._error(ERROR_CODE.ACCOUNT_ORGANIZATION_NOT_FOUND, organizationName);
            }

            if (!organizationID.equals(account.organization)) {
                throw this._error(ERROR_CODE.ALREADY_A_MEMBER, organizationName);
            }

            organization.owner = account._id;

            await organization.save();

            res.agent.add('account', account.username);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}