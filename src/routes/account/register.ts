/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Register
 */

import { AccountController, EMAIL_VALIDATE_RESPONSE, GroupController, IAccountModel, IGroupModel, INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController, PASSWORD_VALIDATE_RESPONSE, PHONE_VALIDATE_RESPONSE, TagController, USERNAME_VALIDATE_RESPONSE, validateEmail, validatePassword, validatePhone, validateUsername } from "@brontosaurus/db";
import { ITagModel } from "@brontosaurus/db/model/tag";
import { Basics } from "@brontosaurus/definition";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";
import { jsonifyBasicRecords } from "../../util/token";

export type RegisterRouteBody = {

    readonly displayName?: string;
    readonly email?: string;
    readonly phone?: string;

    readonly username: string;
    readonly password: string;
    readonly infos: Record<string, Basics>;
    readonly tags: string[];
    readonly groups: string[];

    readonly organization?: string;
};

export class RegisterRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/register';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/register - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/register - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/register - GroupVerifyHandler'),
        basicHook.wrap(this._registerHandler.bind(this), '/account/register - Register', true),
    ];

    private async _registerHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<RegisterRouteBody> = Safe.extract(req.body as RegisterRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');
            const password: string = body.directEnsure('password');

            const tags: string[] = body.direct('tags');
            const groups: string[] = body.direct('groups');

            if (!Array.isArray(tags)) {
                throw panic.code(ERROR_CODE.INSUFFICIENT_INFORMATION, 'tags');
            }

            if (!Array.isArray(groups)) {
                throw panic.code(ERROR_CODE.INSUFFICIENT_INFORMATION, 'groups');
            }

            const usernameValidationResult: USERNAME_VALIDATE_RESPONSE = validateUsername(username);

            if (usernameValidationResult !== USERNAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_USERNAME, usernameValidationResult);
            }

            const passwordValidationResult: PASSWORD_VALIDATE_RESPONSE = validatePassword(password);

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

            const infoLine: Record<string, Basics> | string = body.direct('infos');
            const infos: Record<string, Basics> = jsonifyBasicRecords(
                infoLine,
                this._error(ERROR_CODE.INFO_LINE_FORMAT_ERROR, infoLine.toString()));

            const isDuplicated: boolean = await AccountController.isAccountDuplicatedByUsername(username);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ACCOUNT, username);
            }

            const account: IAccountModel = await this._createUnsavedAccount(
                username,
                password,
                req.body.displayName,
                req.body.email,
                req.body.phone,
                infos,
                req.body.organization,
            );

            const parsedTags: ITagModel[] = await TagController.getTagByNames(tags);
            const parsedGroups: IGroupModel[] = await GroupController.getGroupByNames(groups);

            account.tags = parsedTags.map((tag: ITagModel) => tag._id);
            account.groups = parsedGroups.map((group: IGroupModel) => group._id);

            await account.save();

            res.agent.add('account', account.username);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }

    private async _createUnsavedAccount(
        username: string,
        password: string,
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
