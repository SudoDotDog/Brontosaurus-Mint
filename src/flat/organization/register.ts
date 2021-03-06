/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Flats_Organization
 * @description Register
 */

import { AccountController, EMAIL_VALIDATE_RESPONSE, IAccountModel, INamespaceModel, INTERNAL_USER_GROUP, IOrganizationModel, NamespaceController, OrganizationController, PHONE_VALIDATE_RESPONSE, USERNAME_VALIDATE_RESPONSE, validateEmail, validatePhone, validateUsername } from "@brontosaurus/db";
import { Basics } from "@brontosaurus/definition";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { createRandomTempPassword } from "../../util/auth";
import { ERROR_CODE } from "../../util/error";
import { jsonifyBasicRecords, SafeToken } from "../../util/token";

export type FlatOrganizationRegisterRouteBody = {

    readonly username: string;
    readonly namespace: string;
    readonly infos: Record<string, Basics>;

    readonly displayName?: string;
    readonly email?: string;
    readonly phone?: string;
};

export class FlatOrganizationRegisterRoute extends BrontosaurusRoute {

    public readonly path: string = '/flat/organization/register';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.ORGANIZATION_CONTROL]), 'Group Verify'),
        autoHook.wrap(this._flatRegisterSubOrganizationAccountHandler.bind(this), 'Flat Register'),
    ];

    private async _flatRegisterSubOrganizationAccountHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FlatOrganizationRegisterRouteBody> = Safe.extract(req.body as FlatOrganizationRegisterRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const token: SafeToken = req.principal;
            const registeree: string = token.body.direct('username');
            const registereeNamespace: string = token.body.direct('namespace');
            const organizationName: string | undefined = token.body.direct('organization', this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_ORGANIZATION));

            if (!organizationName) {
                throw this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_ORGANIZATION);
            }

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(organizationName);

            if (!organization) {
                throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, organizationName);
            }

            const accountCount: number = await AccountController.getAccountCountByOrganization(organization._id);

            if (accountCount >= organization.limit) {
                throw this._error(ERROR_CODE.ORGANIZATION_LIMIT_EXCEED, accountCount.toString(), organization.limit.toString());
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

            const defaultNamespace: INamespaceModel = await NamespaceController.getBrontosaurusDefaultNamespace();

            const isDuplicated: boolean = await AccountController.isAccountDuplicatedByUsernameAndNamespace(username, defaultNamespace._id);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ACCOUNT, username);
            }

            const tempPassword: string = createRandomTempPassword();

            const account: IAccountModel = AccountController.createOnLimboUnsavedAccount(
                username,
                tempPassword,
                defaultNamespace._id,
                req.body.displayName,
                req.body.email,
                req.body.phone,
                organization._id,
                [],
                infos,
                {
                    registeredBy: registereeNamespace + '/' + registeree,
                });
            await account.save();

            res.agent.add('tempPassword', tempPassword);
            res.agent.add('account', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
