/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Group
 * @description Remove All
 */

import { AccountController, GroupController, IAccountModel, IGroupModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { ObjectID } from "bson";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type RemoveAllGroupBody = {

    readonly name: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    name: createStringPattern(),
});

export class RemoveAllGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/remove-all';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._removeAllGroupHandler.bind(this), 'Remove All From Group'),
    ];

    private async _removeAllGroupHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: RemoveAllGroupBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(
                    ERROR_CODE.REQUEST_DOES_MATCH_PATTERN,
                    verify.invalids[0],
                );
            }

            const group: IGroupModel | null = await GroupController.getGroupByName(body.name);

            if (!group) {
                throw this._error(
                    ERROR_CODE.GROUP_NOT_FOUND,
                    body.name,
                );
            }

            const accounts: IAccountModel[] = await AccountController.getAccountsByGroup(group._id);

            for (const account of accounts) {

                account.groups = account.groups.filter((current: ObjectID) => {
                    return !current.equals(group._id);
                });
                await account.save();
            }

            res.agent.add('group', group.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
