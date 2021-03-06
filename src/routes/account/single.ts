/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Single
 */

import { AccountController, AccountNamespaceMatch, IAccountModel, INamespaceModel, INTERNAL_USER_GROUP, MatchController, OrganizationController, OrganizationDetail, SpecialPassword } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { Throwable_MapDecorators, Throwable_MapGroups, Throwable_MapTags } from "../../util/auth";
import { ERROR_CODE, panic } from "../../util/error";

export type SingleAccountBody = {

    readonly username: string;
    readonly namespace: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    username: createStringPattern(),
    namespace: createStringPattern(),
});

export class SingleAccountRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._singleAccountHandler.bind(this), 'Single'),
    ];

    private async _singleAccountHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SingleAccountBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const decoded: string = decodeURIComponent(body.username);
            const matchResult: AccountNamespaceMatch = await MatchController.getAccountNamespaceMatchByUsernameAndNamespace(decoded, body.namespace);
            if (matchResult.succeed === false) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, body.username);
            }

            const account: IAccountModel = matchResult.account;
            const namespaceInstance: INamespaceModel = matchResult.namespace;

            const accountGroups: string[] = await Throwable_MapGroups(account.groups);
            const accountTags: string[] = await Throwable_MapTags(account.tags);
            const accountDecorators: string[] = await Throwable_MapDecorators(account.decorators);

            const usernameMap: Map<string, string> = await this._generateUsernameMap(account.temporaryPasswords, account.applicationPasswords);

            const temporaryPasswords = account.temporaryPasswords.map((value: SpecialPassword) => ({
                id: value.passwordId,
                by: usernameMap.get(value.by.toHexString()),
                expireAt: value.expireAt,
                suspendedAt: value.suspendedAt,
                suspendedBy: value.suspendedBy ? usernameMap.get(value.by.toHexString()) : undefined,
            }));
            const applicationPasswords = account.applicationPasswords.map((value: SpecialPassword) => ({
                id: value.passwordId,
                by: usernameMap.get(value.by.toHexString()),
                expireAt: value.expireAt,
                suspendedAt: value.suspendedAt,
                suspendedBy: value.suspendedBy ? usernameMap.get(value.by.toHexString()) : undefined,
            }));

            const response = {
                active: account.active,
                username: account.username,
                namespace: namespaceInstance.namespace,
                avatar: account.avatar,
                displayName: account.displayName,
                email: account.email,
                phone: account.phone,
                twoFA: Boolean(account.twoFA),
                previousPasswordsCount: account.previousPasswords.length,
                groups: accountGroups,
                tags: accountTags,
                decorators: accountDecorators,
                infos: account.getInfoRecords(),
                beacons: account.getBeaconRecords(),
                temporaryPasswords,
                applicationPasswords,
            };

            if (!account.organization) {

                res.agent.add('account', response);
            } else {

                const organization: OrganizationDetail | null = await OrganizationController.getOrganizationDetailsById(account.organization);

                if (!organization) {
                    throw panic.code(ERROR_CODE.ORGANIZATION_NOT_FOUND, account.organization.toHexString());
                }

                res.agent.add('account', {
                    ...response,
                    organization,
                });
            }
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }

    private async _generateUsernameMap(temporaryPasswords: SpecialPassword[], applicationPasswords: SpecialPassword[]): Promise<Map<string, string>> {

        const accountMap: Map<string, string> = new Map();
        for (const password of temporaryPasswords) {
            if (password.suspendedBy) {
                accountMap.set(password.suspendedBy.toHexString(), 'Unknown');
            }
            accountMap.set(password.by.toHexString(), 'Unknown');
        }

        for (const password of applicationPasswords) {
            if (password.suspendedBy) {
                accountMap.set(password.suspendedBy.toHexString(), 'Unknown');
            }
            accountMap.set(password.by.toHexString(), 'Unknown');
        }

        const accounts: IAccountModel[] = await AccountController.getAccountsByIds([...accountMap.keys()]);
        for (const account of accounts) {
            accountMap.set(account._id.toString(), account.username);
        }

        return accountMap;
    }
}
