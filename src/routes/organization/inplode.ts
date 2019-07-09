/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Inplode
 */

import { AccountController, COMMON_NAME_VALIDATE_RESPONSE, GroupController, IAccountModel, IGroupModel, INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController, USERNAME_VALIDATE_RESPONSE, validateCommonName, validateUsername } from "@brontosaurus/db";
import { Basics } from "@brontosaurus/definition";
import { _Random } from "@sudoo/bark/random";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";
import { jsonifyBasicRecords } from "../../util/token";

export type OrganizationInplodeRouteBody = {

    name: string;
    username: string;
    email: string;
    phone: string;
    infos: Record<string, Basics>;
};

export class OrganizationInplodeRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/inplode';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/inplode - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/inplode - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/organization/inplode - GroupVerifyHandler'),
        basicHook.wrap(this._inplodeOrganizationHandler.bind(this), '/organization/inplode - Inplode', true),
    ];

    private async _inplodeOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<OrganizationInplodeRouteBody> = Safe.extract(req.body as OrganizationInplodeRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const username: string = body.directEnsure('username');
            const name: string = body.directEnsure('name');

            const usernameValidationResult: USERNAME_VALIDATE_RESPONSE = validateUsername(username);

            if (usernameValidationResult !== USERNAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_USERNAME, usernameValidationResult);
            }

            const validateResult: COMMON_NAME_VALIDATE_RESPONSE = validateCommonName(name);

            if (validateResult !== COMMON_NAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_NAME, validateResult);
            }

            const infoLine: Record<string, Basics> | string = body.direct('infos');
            const infos: Record<string, Basics> = jsonifyBasicRecords(
                infoLine,
                this._error(ERROR_CODE.INFO_LINE_FORMAT_ERROR, infoLine.toString()));

            const isAccountDuplicated: boolean = await AccountController.isAccountDuplicatedByUsername(username);

            if (isAccountDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ACCOUNT, username);
            }

            const isOrganizationDuplicated: boolean = await OrganizationController.isOrganizationDuplicatedByName(name);

            if (isOrganizationDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ORGANIZATION, name);
            }

            const organizationControlGroup: IGroupModel | null = await GroupController.getGroupByName(INTERNAL_USER_GROUP.ORGANIZATION_CONTROL);

            if (!organizationControlGroup) {
                throw this._error(ERROR_CODE.INTERNAL_ERROR);
            }

            const tempPassword: string = _Random.random(6);

            const account: IAccountModel = AccountController.createOnLimboUnsavedAccount(
                username,
                tempPassword,
                req.body.email,
                req.body.phone,
                undefined,
                [organizationControlGroup._id],
                infos,
            );
            const organization: IOrganizationModel = OrganizationController.createUnsavedOrganization(name, account._id);

            account.organization = organization._id;

            await Promise.all([account.save(), organization.save()]);

            res.agent.add('account', account.username);
            res.agent.add('organization', organization.name);
            res.agent.add('tempPassword', tempPassword);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
