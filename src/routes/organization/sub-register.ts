/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Sub Register
 */

import { AccountController, EMAIL_VALIDATE_RESPONSE, IAccountModel, INamespaceModel, INTERNAL_USER_GROUP, IOrganizationModel, NamespaceController, OrganizationController, PHONE_VALIDATE_RESPONSE, USERNAME_VALIDATE_RESPONSE, validateEmail, validateNamespace, validatePhone, validateUsername } from "@brontosaurus/db";
import { Basics } from "@brontosaurus/definition";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { createRandomTempPassword } from "../../util/auth";
import { ERROR_CODE, panic } from "../../util/error";
import { createInfoPattern } from "../../util/pattern";
import { jsonifyBasicRecords } from "../../util/token";

export type OrganizationSubRegisterRouteBody = {

    readonly organization: string;
    readonly username: string;
    readonly namespace: string;
    readonly infos: Record<string, Basics>;

    readonly displayName?: string;
    readonly email?: string;
    readonly phone?: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    organization: createStringPattern(),
    username: createStringPattern(),
    namespace: createStringPattern(),
    infos: createInfoPattern(),

    displayName: createStringPattern({
        optional: true,
    }),
    email: createStringPattern({
        optional: true,
    }),
    phone: createStringPattern({
        optional: true,
    }),
});

export class OrganizationSubRegisterRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/sub-register';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._organizationCreateSubHandler.bind(this), 'Register Sub Account'),
    ];

    private async _organizationCreateSubHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: OrganizationSubRegisterRouteBody = req.body;

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

            const usernameValidationResult: USERNAME_VALIDATE_RESPONSE = validateUsername(body.username);

            if (usernameValidationResult !== USERNAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_USERNAME, usernameValidationResult);
            }

            const namespaceValidationResult: boolean = validateNamespace(body.namespace);

            if (!namespaceValidationResult) {
                throw this._error(ERROR_CODE.INVALID_NAMESPACE, usernameValidationResult);
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

            const infos: Record<string, Basics> = jsonifyBasicRecords(
                body.infos,
                this._error(
                    ERROR_CODE.INFO_LINE_FORMAT_ERROR,
                    body.infos.toString(),
                ));

            const namespaceInstance: INamespaceModel | null = await NamespaceController.getNamespaceByNamespace(body.namespace);

            if (!namespaceInstance) {
                throw panic.code(ERROR_CODE.NAMESPACE_NOT_FOUND, body.namespace);
            }

            const isAccountDuplicated: boolean = await AccountController.isAccountDuplicatedByUsernameAndNamespace(body.username, namespaceInstance._id);

            if (isAccountDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ACCOUNT, body.username);
            }

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(body.organization);

            if (!organization) {
                throw panic.code(
                    ERROR_CODE.ORGANIZATION_NOT_FOUND,
                    body.organization,
                );
            }

            const tempPassword: string = createRandomTempPassword();

            const account: IAccountModel = AccountController.createOnLimboUnsavedAccount(
                body.username,
                tempPassword,
                namespaceInstance._id,
                body.displayName,
                body.email,
                body.phone,
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
