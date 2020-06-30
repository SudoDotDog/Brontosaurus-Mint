/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Add Group
 */

import { GroupController, IAccountModel, IGroupModel, INTERNAL_USER_GROUP, MatchController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type AddGroupBody = {

    readonly username: string;
    readonly namespace: string;
    readonly group: string;
};

export const bodyPattern: Pattern = createStrictMapPattern({

    username: createStringPattern(),
    namespace: createStringPattern(),
    group: createStringPattern(),
});

export class AddGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/add-group';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'GroupVerifyHandler'),
        autoHook.wrap(this._addGroupHandler.bind(this), 'Add Group'),
    ];

    private async _addGroupHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: AddGroupBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(body.username, body.namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, body.username);
            }

            const group: IGroupModel | null = await GroupController.getGroupByName(body.group);

            if (!group) {
                throw this._error(ERROR_CODE.GROUP_NOT_FOUND, body.group);
            }

            account.addGroup(group._id);
            account.resetMint();

            await account.save();

            res.agent.add('account', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
