/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Deactivate
 */

import { INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";
import { ERROR_CODE, panic } from "../../util/error";

export type OrganizationDeactivateRouteBody = {

    readonly organization: string;
};

export class OrganizationDeactivateRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/deactivate';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/deactivate - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/deactivate - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/organization/deactivate - GroupVerifyHandler'),
        basicHook.wrap(this._deactivateOrganizationHandler.bind(this), '/organization/deactivate - Deactivate', true),
    ];

    private async _deactivateOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<OrganizationDeactivateRouteBody> = Safe.extract(req.body as OrganizationDeactivateRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const organizationName: string = body.directEnsure('organization');

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(organizationName);

            if (!organization) {

                throw panic.code(ERROR_CODE.ORGANIZATION_NOT_FOUND, organizationName);
            }

            organization.active = false;
            await organization.save();

            res.agent.add('deactivated', organization.name);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
