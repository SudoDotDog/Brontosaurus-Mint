/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Activate
 */

import { INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type OrganizationActivateRouteBody = {

    readonly organization: string;
};

export class OrganizationActivateRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/activate';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), 'GroupVerifyHandler'),
        autoHook.wrap(this._activateOrganizationHandler.bind(this), 'Activate'),
    ];

    private async _activateOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<OrganizationActivateRouteBody> = Safe.extract(req.body as OrganizationActivateRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const organizationName: string = body.directEnsure('organization');

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(organizationName);

            if (!organization) {

                throw panic.code(ERROR_CODE.ORGANIZATION_NOT_FOUND, organizationName);
            }

            organization.active = true;
            await organization.save();

            res.agent.add('activated', organization.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
