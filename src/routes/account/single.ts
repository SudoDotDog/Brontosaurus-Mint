/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Red_Account
 * @description Single
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP, OrganizationController, OrganizationDetail } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { Throwable_MapDecorators, Throwable_MapGroups } from "../../util/auth";
import { ERROR_CODE, panic } from "../../util/error";
import { BrontosaurusRoute } from "../basic";

export type SingleAccountBody = {

    username: string;
};

export class SingleAccountRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/single - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/single - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/single - GroupVerifyHandler'),
        basicHook.wrap(this._singleAccountHandler.bind(this), '/account/single - Single', true),
    ];

    private async _singleAccountHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<SingleAccountBody> = Safe.extract(req.body as SingleAccountBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const username: string = body.direct('username');
            if (typeof username !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'username', 'string', (username as any).toString());
            }

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);
            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const accountGroups: string[] = await Throwable_MapGroups(account.groups);
            const accountDecorators: string[] = await Throwable_MapDecorators(account.decorators);

            if (!account.organization) {

                res.agent.add('account', {
                    username: account.username,
                    email: account.email,
                    phone: account.phone,
                    twoFA: Boolean(account.twoFA),
                    groups: accountGroups,
                    decorators: accountDecorators,
                    infos: account.getInfoRecords(),
                    beacons: account.getBeaconRecords(),
                });
            } else {

                const organization: OrganizationDetail | null = await OrganizationController.getOrganizationDetailsById(account.organization);

                if (!organization) {
                    throw panic.code(ERROR_CODE.ORGANIZATION_NOT_FOUND, account.organization.toHexString());
                }

                res.agent.add('account', {
                    username: account.username,
                    email: account.email,
                    phone: account.phone,
                    twoFA: Boolean(account.twoFA),
                    groups: accountGroups,
                    decorators: accountDecorators,
                    organization,
                    infos: account.getInfoRecords(),
                    beacons: account.getBeaconRecords(),
                });
            }
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
