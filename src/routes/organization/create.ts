/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Create
 */

import { COMMON_NAME_VALIDATE_RESPONSE, IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, MatchController, OrganizationController, validateCommonName } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type OrganizationCreateRouteBody = {

    readonly name: string;
    readonly owner: string;
    readonly ownerNamespace: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    name: createStringPattern(),
    owner: createStringPattern(),
    ownerNamespace: createStringPattern(),
});

export class OrganizationCreateRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._createOrganizationHandler.bind(this), 'Create Organization'),
    ];

    private async _createOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: OrganizationCreateRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(
                    ERROR_CODE.REQUEST_DOES_MATCH_PATTERN,
                    verify.invalids[0],
                );
            }

            const validateResult: COMMON_NAME_VALIDATE_RESPONSE = validateCommonName(body.name);

            if (validateResult !== COMMON_NAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_NAME, validateResult);
            }

            const isDuplicated: boolean = await OrganizationController.isOrganizationDuplicatedByName(body.name);

            if (isDuplicated) {
                throw this._error(
                    ERROR_CODE.DUPLICATE_ORGANIZATION,
                    body.name,
                );
            }

            const ownerUser: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(
                body.owner,
                body.ownerNamespace,
            );

            if (!ownerUser) {
                throw this._error(
                    ERROR_CODE.ACCOUNT_NOT_FOUND,
                    body.owner,
                );
            }

            if (ownerUser.organization) {

                const previousOrganization: IOrganizationModel | null = await OrganizationController.getOrganizationById(ownerUser.organization);

                if (!previousOrganization) {
                    throw this._error(ERROR_CODE.INTERNAL_ERROR);
                }

                throw this._error(ERROR_CODE.ALREADY_A_MEMBER, previousOrganization.name);
            }


            const organization: IOrganizationModel = OrganizationController.createUnsavedOrganization(body.name, ownerUser._id);
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
