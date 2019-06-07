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
import { jsonifyBasicRecords } from "../../util/token";

export type RegisterRouteBody = {

    username: string;
    password: string;
    infos: Record<string, Basics>;

    organization?: string;
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

            const username: string = body.directEnsure('username');
            const password: string = body.directEnsure('password');

            const infoLine: Record<string, Basics> | string = body.direct('infos');
            const infos: Record<string, Basics> = jsonifyBasicRecords(
                infoLine,
                this._error(ERROR_CODE.INFO_LINE_FORMAT_ERROR, infoLine.toString()));

            const isDuplicated: boolean = await AccountController.isAccountDuplicatedByUsername(username);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_ACCOUNT, username);
            }

            if (req.body.organization) {

                const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(req.body.name);
                if (!organization) {

                    throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, req.body.organization);
                }

                const account: IAccountModel = AccountController.createUnsavedAccount(username, password, organization._id, [], infos);
                await account.save();

                res.agent.add('account', account.username);
            } else {

                const account: IAccountModel = AccountController.createUnsavedAccount(username, password, undefined, [], infos);
                await account.save();

                res.agent.add('account', account.username);
            }
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
