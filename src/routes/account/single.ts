/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Single
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP, OrganizationController, OrganizationDetail, SpecialPassword } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { Throwable_MapDecorators, Throwable_MapGroups, Throwable_MapTags } from "../../util/auth";
import { ERROR_CODE, panic } from "../../util/error";

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
        basicHook.wrap(this._singleAccountHandler.bind(this), '/account/single - Single'),
    ];

    private async _singleAccountHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<SingleAccountBody> = Safe.extract(req.body as SingleAccountBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.direct('username');
            if (typeof username !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'username', 'string', (username as any).toString());
            }

            const decoded: string = decodeURIComponent(username);
            const account: IAccountModel | null = await AccountController.getAccountByUsername(decoded);
            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const accountGroups: string[] = await Throwable_MapGroups(account.groups);
            const accountTags: string[] = await Throwable_MapTags(account.tags);
            const accountDecorators: string[] = await Throwable_MapDecorators(account.decorators);

            const temporaryPasswords = account.temporaryPasswords.map((value: SpecialPassword) => ({
                id: value.passwordId,
                by: value.by,
                expireAt: value.expireAt,
                suspendedAt: value.suspendedAt,
                suspendedBy: value.suspendedBy,
            }));
            const applicationPasswords = account.applicationPasswords.map((value: SpecialPassword) => ({
                id: value.passwordId,
                by: value.by,
                expireAt: value.expireAt,
                suspendedAt: value.suspendedAt,
                suspendedBy: value.suspendedBy,
            }));

            if (!account.organization) {

                res.agent.add('account', {
                    active: account.active,
                    username: account.username,
                    displayName: account.displayName,
                    email: account.email,
                    phone: account.phone,
                    twoFA: Boolean(account.twoFA),
                    groups: accountGroups,
                    tags: accountTags,
                    decorators: accountDecorators,
                    infos: account.getInfoRecords(),
                    beacons: account.getBeaconRecords(),
                    temporaryPasswords,
                    applicationPasswords,
                });
            } else {

                const organization: OrganizationDetail | null = await OrganizationController.getOrganizationDetailsById(account.organization);

                if (!organization) {
                    throw panic.code(ERROR_CODE.ORGANIZATION_NOT_FOUND, account.organization.toHexString());
                }

                res.agent.add('account', {
                    active: account.active,
                    username: account.username,
                    displayName: account.displayName,
                    email: account.email,
                    phone: account.phone,
                    twoFA: Boolean(account.twoFA),
                    groups: accountGroups,
                    tags: accountTags,
                    decorators: accountDecorators,
                    organization,
                    infos: account.getInfoRecords(),
                    beacons: account.getBeaconRecords(),
                    temporaryPasswords,
                    applicationPasswords,
                });
            }
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
