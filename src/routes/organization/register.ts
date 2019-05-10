/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Red_Account
 * @description Register
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController } from "@brontosaurus/db";
import { Basics } from "@brontosaurus/definition";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";
import { ERROR_CODE } from "../../util/error";
import { SafeToken } from "../../util/token";

export type OrganizationRegisterRouteBody = {

    username: string;
    password: string;
    infos: Record<string, Basics>;
};

export class OrganizationRegisterRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/register';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/register - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/register - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.ORGANIZATION_CONTROL], this._error), '/organization/register - GroupVerifyHandler'),
        basicHook.wrap(this._registerHandler.bind(this), '/organization/register - Register', true),
    ];

    private async _registerHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<OrganizationRegisterRouteBody> = Safe.extract(req.body as OrganizationRegisterRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const token: SafeToken = req.principal;
            const organizationName: string = token.body.direct('organization', this._error(ERROR_CODE.ACCOUNT_ORGANIZATION_NOT_FOUND));

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(organizationName);

            if (!organization) {
                throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, organizationName);
            }

            const username: string = body.directEnsure('username');
            const password: string = body.directEnsure('password');

            const infoLine: Record<string, Basics> | string = body.direct('infos');
            const infos: Record<string, Basics> = typeof infoLine === 'string'
                ? JSON.parse(infoLine)
                : infoLine;

            const isDuplicated: boolean = await AccountController.isAccountDuplicatedByUsername(username);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ACCOUNT, username);
            }

            const account: IAccountModel = AccountController.createUnsavedAccount(username, password, organization._id, [], infos);
            await account.save();

            res.agent.add('account', account.username);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}