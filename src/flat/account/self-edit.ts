/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Flats_Account
 * @description Self Edit
 */

import { IAccountModel, INTERNAL_USER_GROUP, MatchController } from "@brontosaurus/db";
import { Basics } from "@brontosaurus/definition";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";
import { parseInfo, SafeToken } from "../../util/token";

export type FlatSelfEditBody = {

    readonly username: string;
    readonly namespace: string;
    readonly account: Partial<{
        readonly infos: Record<string, Basics>;
    }>;
    readonly avatar?: string;
    readonly displayName?: string;
    readonly email?: string;
    readonly phone?: string;
};

export class FlatSelfEditRoute extends BrontosaurusRoute {

    public readonly path: string = '/flat/account/edit/self';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/flat/account/edit/self - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/flat/account/edit/self - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SELF_CONTROL]), '/flat/account/edit/self - GroupVerifyHandler'),
        basicHook.wrap(this._flatSelfEditHandler.bind(this), '/flat/account/edit/self - Self Edit'),
    ];

    private async _flatSelfEditHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FlatSelfEditBody> = Safe.extract(req.body as FlatSelfEditBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');
            const namespace: string = body.directEnsure('namespace');
            const principal: SafeToken = req.principal;

            const tokenUsername: string = principal.body.directEnsure('username', this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_INFORMATION, 'username'));
            const tokenNamespace: string = principal.body.directEnsure('namespace', this._error(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_INFORMATION, 'namespace'));

            if (username !== tokenUsername) {
                throw this._error(ERROR_CODE.PERMISSION_USER_DOES_NOT_MATCH, username, tokenUsername);
            }

            if (namespace !== tokenNamespace) {
                throw this._error(ERROR_CODE.PERMISSION_NAMESPACE_DOES_NOT_MATCH, namespace, tokenNamespace);
            }

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(username, namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const update: Partial<{
                infos: Record<string, Basics>;
            }> = body.direct('account');

            if (update.infos) {

                const newInfos: Record<string, Basics> = {
                    ...account.getInfoRecords(),
                    ...update.infos,
                };

                account.infos = parseInfo(newInfos);
            }

            if (req.body.avatar) {
                account.avatar = req.body.avatar;
            } else if (account.avatar) {
                account.avatar = undefined;
            }
            if (req.body.email) {
                account.email = req.body.email;
            } else if (account.email) {
                account.email = undefined;
            }
            if (req.body.phone) {
                account.phone = req.body.phone;
            } else if (account.phone) {
                account.phone = undefined;
            }
            if (req.body.displayName) {
                account.displayName = req.body.displayName;
            } else if (account.displayName) {
                account.displayName = undefined;
            }

            await account.save();

            res.agent.add('account', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
