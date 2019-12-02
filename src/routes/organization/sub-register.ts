/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Sub Register
 */

import { AccountController, EMAIL_VALIDATE_RESPONSE, IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController, PHONE_VALIDATE_RESPONSE, USERNAME_VALIDATE_RESPONSE, validateEmail, validatePhone, validateUsername } from "@brontosaurus/db";
import { Basics } from "@brontosaurus/definition";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { createRandomTempPassword } from "../../util/auth";
import { ERROR_CODE, panic } from "../../util/error";
import { jsonifyBasicRecords } from "../../util/token";

export type OrganizationSubRegisterRouteBody = {

    organization: string;
    username: string;
    infos: Record<string, Basics>;

    displayName?: string;
    email?: string;
    phone?: string;
};

export class OrganizationSubRegisterRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/sub-register';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/sub-register - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/sub-register - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/organization/sub-register - GroupVerifyHandler'),
        basicHook.wrap(this._organizationCreateSubHandler.bind(this), '/organization/sub-register - Register Sub', true),
    ];

    private async _organizationCreateSubHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<OrganizationSubRegisterRouteBody> = Safe.extract(req.body as OrganizationSubRegisterRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');

            const usernameValidationResult: USERNAME_VALIDATE_RESPONSE = validateUsername(username);

            if (usernameValidationResult !== USERNAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_USERNAME, usernameValidationResult);
            }

            if (req.body.email) {

                const emailValidationResult: EMAIL_VALIDATE_RESPONSE = validateEmail(req.body.email);
                if (emailValidationResult !== EMAIL_VALIDATE_RESPONSE.OK) {
                    throw this._error(ERROR_CODE.INVALID_EMAIL, emailValidationResult);
                }
            }

            if (req.body.phone) {

                const phoneValidationResult: PHONE_VALIDATE_RESPONSE = validatePhone(req.body.phone);
                if (phoneValidationResult !== PHONE_VALIDATE_RESPONSE.OK) {
                    throw this._error(ERROR_CODE.INVALID_PHONE, phoneValidationResult);
                }
            }

            const infoLine: Record<string, Basics> | string = body.direct('infos');
            const infos: Record<string, Basics> = jsonifyBasicRecords(
                infoLine,
                this._error(ERROR_CODE.INFO_LINE_FORMAT_ERROR, infoLine.toString()));

            const isAccountDuplicated: boolean = await AccountController.isAccountDuplicatedByUsername(username);

            if (isAccountDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ACCOUNT, username);
            }

            const organizationName: string = body.directEnsure('organization');
            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(organizationName);

            if (!organization) {
                throw panic.code(ERROR_CODE.ORGANIZATION_NOT_FOUND, organizationName);
            }

            const tempPassword: string = createRandomTempPassword();

            const account: IAccountModel = AccountController.createOnLimboUnsavedAccount(
                username,
                tempPassword,
                req.body.displayName,
                req.body.email,
                req.body.phone,
                organization._id,
                [],
                infos,
            );

            await account.save();

            res.agent.add('account', account.username);
            res.agent.add('tempPassword', tempPassword);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
