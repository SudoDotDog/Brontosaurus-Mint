/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Create
 */

import { AccountController, COMMON_NAME_VALIDATE_RESPONSE, IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController, validateCommonName } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type OrganizationCreateRouteBody = {

    readonly name: string;
    readonly owner: string;
};

export class OrganizationCreateRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/create - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/create - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/organization/create - GroupVerifyHandler'),
        basicHook.wrap(this._createOrganizationHandler.bind(this), '/organization/create - Create', true),
    ];

    private async _createOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<OrganizationCreateRouteBody> = Safe.extract(req.body as OrganizationCreateRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const name: string = body.direct('name');
            const owner: string = body.direct('owner');

            const validateResult: COMMON_NAME_VALIDATE_RESPONSE = validateCommonName(name);

            if (validateResult !== COMMON_NAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_NAME, validateResult);
            }

            const isDuplicated: boolean = await OrganizationController.isOrganizationDuplicatedByName(name);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ORGANIZATION, name);
            }

            const ownerUser: IAccountModel | null = await AccountController.getAccountByUsername(owner);

            if (!ownerUser) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, owner);
            }

            if (ownerUser.organization) {

                const previousOrganization: IOrganizationModel | null = await OrganizationController.getOrganizationById(ownerUser.organization);

                if (!previousOrganization) {
                    throw this._error(ERROR_CODE.INTERNAL_ERROR);
                }

                throw this._error(ERROR_CODE.ALREADY_A_MEMBER, previousOrganization.name);
            }


            const organization: IOrganizationModel = OrganizationController.createUnsavedOrganization(name, ownerUser._id);
            ownerUser.organization = organization._id;

            await ownerUser.save();
            await organization.save();

            res.agent.add('organization', organization.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
