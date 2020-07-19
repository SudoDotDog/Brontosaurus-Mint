/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Deactivate
 */

import { INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type OrganizationDeactivateRouteBody = {

    readonly organization: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    organization: createStringPattern(),
});

export class OrganizationDeactivateRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/deactivate';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._deactivateOrganizationHandler.bind(this), 'Deactivate Organization'),
    ];

    private async _deactivateOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: OrganizationDeactivateRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(body.organization);

            if (!organization) {
                throw panic.code(ERROR_CODE.ORGANIZATION_NOT_FOUND, body.organization);
            }

            if (!organization.active) {
                throw this._error(ERROR_CODE.ALREADY_DEACTIVATED, body.organization);
            }

            organization.active = false;
            await organization.save();

            res.agent.add('deactivated', organization.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
