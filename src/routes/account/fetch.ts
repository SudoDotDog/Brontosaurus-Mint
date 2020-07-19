/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Fetch
 */

import { AccountController, AttemptController, IAccountModel, INamespaceModel, INTERNAL_USER_GROUP, ResetController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Basics } from "@sudoo/extract/declare";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createNumberPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { getNamespaceMapByNamespaceIds } from "../../data/namespace";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE, panic } from "../../util/error";

export type FetchAccountBody = {

    readonly page: number;
    readonly keyword: string;
};

export type FetchAccountResponse = {

    readonly active: boolean;
    readonly attempts: number;
    readonly resets: number;
    readonly username: string;
    readonly namespaceActive: boolean;
    readonly namespace: string;
    readonly displayName?: string;
    readonly email?: string;
    readonly phone?: string;
    readonly twoFA: boolean;
    readonly groups: number;
    readonly decorators: number;
    readonly tags: number;
    readonly infos: Record<string, Basics>;
};

const bodyPattern: Pattern = createStrictMapPattern({

    page: createNumberPattern({
        integer: true,
    }),
    keyword: createStringPattern(),
});

export class FetchAccountRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._fetchAccountHandler.bind(this), 'Fetch Account'),
    ];

    private async _fetchAccountHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: FetchAccountBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            if (body.page < 0) {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'page', 'number', body.page.toString());
            }

            const pages: number = await AccountController.getSelectedAccountPages(pageLimit, body.keyword);
            const accounts: IAccountModel[] = await AccountController.getSelectedAccountsByPage(
                pageLimit,
                Math.floor(body.page),
                body.keyword,
            );

            const namespaceMap: Map<string, INamespaceModel> = await getNamespaceMapByNamespaceIds(accounts.map((each) => each.namespace));
            const result: FetchAccountResponse[] = [];

            for (const account of accounts) {

                const attempts: number = await AttemptController.getAttemptCountByAccount(account._id);
                const resets: number = await ResetController.getResetCountByAccount(account._id);

                const namespaceInstance: INamespaceModel | undefined = namespaceMap.get(account.namespace.toHexString());

                if (!namespaceInstance) {
                    throw panic.code(ERROR_CODE.NAMESPACE_NOT_FOUND, account.namespace.toHexString());
                }

                result.push({
                    active: account.active,
                    attempts,
                    resets,
                    username: account.username,
                    namespaceActive: namespaceInstance.active,
                    namespace: namespaceInstance.namespace,
                    displayName: account.displayName,
                    email: account.email,
                    phone: account.phone,
                    twoFA: Boolean(account.twoFA),
                    groups: account.groups.length,
                    decorators: account.decorators.length,
                    tags: account.tags.length,
                    infos: account.getInfoRecords(),
                });
            }

            res.agent.add('accounts', result);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
