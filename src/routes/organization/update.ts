/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Update
 */

import { DecoratorController, IDecoratorModel, IGroupModel, INTERNAL_USER_GROUP, OrganizationController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";
import { ERROR_CODE } from "../../util/error";

export type UpdateOrganizationBody = {

    name: string;
    decorators: string[];
};

export class UpdateOrganizationRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/update - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/update - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/organization/update - GroupVerifyHandler'),
        basicHook.wrap(this._updateOrganizationHandler.bind(this), '/organization/update - Update Organization', true),
    ];

    private async _updateOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<UpdateOrganizationBody> = Safe.extract(req.body as UpdateOrganizationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const name: string = body.directEnsure('name');
            const decoratorsNames: string[] = body.direct('decorators');

            const organization: IGroupModel | null = await OrganizationController.getOrganizationByName(name);

            if (!organization) {
                throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, name);
            }

            const decorators: IDecoratorModel[] = await DecoratorController.getDecoratorByNames(decoratorsNames);

            organization.decorators = decorators.map((decorator: IDecoratorModel) => decorator._id);

            await organization.save();

            res.agent.add('organization', organization.name);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
