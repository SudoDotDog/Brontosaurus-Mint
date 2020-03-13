/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Inplode
 */

import { AccountController, COMMON_NAME_VALIDATE_RESPONSE, EMAIL_VALIDATE_RESPONSE, IAccountModel, INamespaceModel, INTERNAL_USER_GROUP, IOrganizationModel, ITagModel, NamespaceController, OrganizationController, PHONE_VALIDATE_RESPONSE, TagController, USERNAME_VALIDATE_RESPONSE, validateCommonName, validateEmail, validateNamespace, validatePhone, validateUsername } from "@brontosaurus/db";
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

export type OrganizationInplodeRouteBody = {

    readonly name: string;
    readonly username: string;
    readonly namespace: string;
    readonly tags: string[];
    readonly infos: Record<string, Basics>;

    readonly displayName?: string;
    readonly email?: string;
    readonly phone?: string;
};

export class OrganizationInplodeRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/inplode';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/inplode - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/inplode - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/organization/inplode - GroupVerifyHandler'),
        basicHook.wrap(this._inplodeOrganizationHandler.bind(this), '/organization/inplode - Inplode'),
    ];

    private async _inplodeOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<OrganizationInplodeRouteBody> = Safe.extract(req.body as OrganizationInplodeRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');
            const namespace: string = body.directEnsure('namespace');
            const name: string = body.directEnsure('name');
            const tags: string[] = body.direct('tags');

            if (!Array.isArray(tags)) {
                throw this._error(ERROR_CODE.INSUFFICIENT_INFORMATION, tags as any);
            }

            const usernameValidationResult: USERNAME_VALIDATE_RESPONSE = validateUsername(username);

            if (usernameValidationResult !== USERNAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_USERNAME, usernameValidationResult);
            }

            const namespaceValidationResult: boolean = validateNamespace(namespace);

            if (!namespaceValidationResult) {
                throw this._error(ERROR_CODE.INVALID_NAMESPACE, usernameValidationResult);
            }

            const validateResult: COMMON_NAME_VALIDATE_RESPONSE = validateCommonName(name);

            if (validateResult !== COMMON_NAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_NAME, validateResult);
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

            if (req.body.displayName) {

                if (typeof req.body.displayName !== 'string') {
                    throw panic.code(ERROR_CODE.INVALID_DISPLAY_NAME, req.body.displayName);
                }
            }

            const infoLine: Record<string, Basics> | string = body.direct('infos');
            const infos: Record<string, Basics> = jsonifyBasicRecords(
                infoLine,
                this._error(ERROR_CODE.INFO_LINE_FORMAT_ERROR, infoLine.toString()));

            const namespaceInstance: INamespaceModel | null = await NamespaceController.getNamespaceByNamespace(namespace);

            if (!namespaceInstance) {
                throw panic.code(ERROR_CODE.NAMESPACE_NOT_FOUND, namespace);
            }

            const isAccountDuplicated: boolean = await AccountController.isAccountDuplicatedByUsernameAndNamespace(username, namespaceInstance._id);

            if (isAccountDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ACCOUNT, username);
            }

            const isOrganizationDuplicated: boolean = await OrganizationController.isOrganizationDuplicatedByName(name);

            if (isOrganizationDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ORGANIZATION, name);
            }

            const tempPassword: string = createRandomTempPassword();

            const account: IAccountModel = AccountController.createOnLimboUnsavedAccount(
                username,
                tempPassword,
                namespaceInstance._id,
                req.body.displayName,
                req.body.email,
                req.body.phone,
                undefined,
                [],
                infos,
            );
            const organization: IOrganizationModel = OrganizationController.createUnsavedOrganization(name, account._id);

            const parsedTags: ITagModel[] = await TagController.getTagByNames(tags);

            organization.tags = parsedTags.map((tag: ITagModel) => tag._id);
            account.organization = organization._id;

            await Promise.all([account.save(), organization.save()]);

            res.agent.add('account', account.username);
            res.agent.add('organization', organization.name);
            res.agent.add('tempPassword', tempPassword);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
