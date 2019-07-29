/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Remove Group
 */

import { AccountController, GroupController, IAccountModel, IGroupModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type RemoveGroupBody = {

    username: string;
    group: string;
};

export class RemoveGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/remove-group';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/remove-group - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/remove-group - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/remove-group - GroupVerifyHandler'),
        basicHook.wrap(this._removeGroupHandler.bind(this), '/account/remove-group - Remove Group', true),
    ];

    private async _removeGroupHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<RemoveGroupBody> = Safe.extract(req.body as RemoveGroupBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const username: string = body.directEnsure('username');
            const groupName: string = body.directEnsure('group');

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);
            const group: IGroupModel | null = await GroupController.getGroupByName(groupName);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            if (!group) {
                throw this._error(ERROR_CODE.GROUP_NOT_FOUND, groupName);
            }

            account.removeGroup(group._id);
            account.resetMint();

            await account.save();

            res.agent.add('account', account.username);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
