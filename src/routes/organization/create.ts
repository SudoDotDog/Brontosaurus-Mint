/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Red_Organization
 * @description Create
 */

import { INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";
import { ERROR_CODE } from "../../util/error";

export type OrganizationCreateRouteBody = {

    name: string;
};

export class OrganizationCreateRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/create - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/create - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/organization/create - GroupVerifyHandler'),
        basicHook.wrap(this._createOrganizationHandler.bind(this), '/organization/create - Register', true),
    ];

    private async _createOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<OrganizationCreateRouteBody> = Safe.extract(req.body as OrganizationCreateRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const name: string = body.direct('name');

            const isDuplicated: boolean = await OrganizationController.isOrganizationDuplicatedByName(name);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ORGANIZATION, name);
            }

            const organization: IOrganizationModel = OrganizationController.createUnsavedOrganization(name);
            await organization.save();

            res.agent.add('organization', organization.name);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
