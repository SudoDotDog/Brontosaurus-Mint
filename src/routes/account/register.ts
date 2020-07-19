/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Register
 */

import { AccountController, EMAIL_VALIDATE_RESPONSE, GroupController, IAccountModel, IGroupModel, INamespaceModel, INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController, PASSWORD_VALIDATE_RESPONSE, PHONE_VALIDATE_RESPONSE, TagController, USERNAME_VALIDATE_RESPONSE, validateEmail, validateNamespace, validatePassword, validatePhone, validateUsername } from "@brontosaurus/db";
import { getNamespaceByNamespace } from "@brontosaurus/db/controller/namespace";
import { ITagModel } from "@brontosaurus/db/model/tag";
import { Basics } from "@brontosaurus/definition";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createListPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { ObjectID } from "bson";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";
import { createInfoPattern } from "../../util/pattern";
import { jsonifyBasicRecords } from "../../util/token";

export type RegisterRouteBody = {

    readonly displayName?: string;
    readonly email?: string;
    readonly phone?: string;

    readonly username: string;
    readonly namespace: string;
    readonly password: string;
    readonly infos: Record<string, Basics>;
    readonly tags: string[];
    readonly groups: string[];

    readonly organization?: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    displayName: createStringPattern({
        optional: true,
    }),
    email: createStringPattern({
        optional: true,
    }),
    phone: createStringPattern({
        optional: true,
    }),

    username: createStringPattern(),
    namespace: createStringPattern(),
    password: createStringPattern(),
    infos: createInfoPattern(),
    tags: createListPattern(
        createStringPattern(),
    ),
    groups: createListPattern(
        createStringPattern(),
    ),

    organization: createStringPattern({
        optional: true,
    }),
});

export class RegisterRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/register';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._registerHandler.bind(this), 'Register'),
    ];

    private async _registerHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: RegisterRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const usernameValidationResult: USERNAME_VALIDATE_RESPONSE = validateUsername(body.username);

            if (usernameValidationResult !== USERNAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_USERNAME, usernameValidationResult);
            }

            const namespaceValidationResult: boolean = validateNamespace(body.namespace);

            if (!namespaceValidationResult) {
                throw this._error(ERROR_CODE.INVALID_NAMESPACE);
            }

            const passwordValidationResult: PASSWORD_VALIDATE_RESPONSE = validatePassword(body.password);

            if (passwordValidationResult !== PASSWORD_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_PASSWORD, passwordValidationResult);
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

            const namespaceInstance: INamespaceModel | null = await getNamespaceByNamespace(body.namespace);

            if (!namespaceInstance) {
                throw this._error(ERROR_CODE.NAMESPACE_NOT_FOUND, body.namespace);
            }

            const infos: Record<string, Basics> = jsonifyBasicRecords(
                body.infos,
                this._error(
                    ERROR_CODE.INFO_LINE_FORMAT_ERROR,
                    body.infos.toString(),
                ));

            const isDuplicated: boolean = await AccountController.isAccountDuplicatedByUsernameAndNamespace(
                body.username,
                namespaceInstance._id,
            );

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ACCOUNT, body.username);
            }

            const account: IAccountModel = await this._createUnsavedAccount(
                body.username,
                body.password,
                namespaceInstance._id,
                body.displayName,
                body.email,
                body.phone,
                infos,
                body.organization,
            );

            const parsedTags: ITagModel[] = await TagController.getTagByNames(body.tags);
            const parsedGroups: IGroupModel[] = await GroupController.getGroupByNames(body.groups);

            account.tags = parsedTags.map((tag: ITagModel) => tag._id);
            account.groups = parsedGroups.map((group: IGroupModel) => group._id);

            await account.save();

            res.agent.add('account', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }

    private async _createUnsavedAccount(
        username: string,
        password: string,
        namespace: ObjectID,
        displayName: string | undefined,
        email: string | undefined,
        phone: string | undefined,
        infos: Record<string, Basics>,
        organizationName?: string,
    ): Promise<IAccountModel> {

        if (organizationName) {

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(organizationName);
            if (!organization) {

                throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, organizationName);
            }

            return AccountController.createUnsavedAccount(
                username,
                password,
                namespace,
                displayName,
                email,
                phone,
                organization._id,
                [],
                infos,
            );
        } else {

            return AccountController.createUnsavedAccount(
                username,
                password,
                namespace,
                displayName,
                email,
                phone,
                undefined,
                [],
                infos,
            );
        }
    }
}
