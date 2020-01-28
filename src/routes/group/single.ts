/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Group
 * @description Single
 */

import { GroupController, IAccount, IGroupModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { getAccountsByGroupLean } from "@brontosaurus/db/controller/account";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { Throwable_MapDecorators } from "../../util/auth";
import { ERROR_CODE } from "../../util/error";

export type SingleGroupBody = {

    name: string;
};

export class SingleGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/group/single - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/group/single - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/group/single - GroupVerifyHandler'),
        basicHook.wrap(this._singleGroupHandler.bind(this), '/group/single - Group Single'),
    ];

    private async _singleGroupHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<SingleGroupBody> = Safe.extract(req.body as SingleGroupBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const name: string = body.direct('name');
            if (typeof name !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'name', 'string', (name as any).toString());
            }

            const decoded: string = decodeURIComponent(name);
            const group: IGroupModel | null = await GroupController.getGroupByName(decoded);
            if (!group) {
                throw this._error(ERROR_CODE.GROUP_NOT_FOUND, name);
            }

            const groupDecorators: string[] = await Throwable_MapDecorators(group.decorators);

            const accounts: IAccount[] = await getAccountsByGroupLean(group._id);

            res.agent.migrate({
                name: group.name,
                members: accounts.map((member: IAccount) => ({
                    active: member.active,
                    username: member.username,
                    displayName: member.displayName,
                    phone: member.phone,
                    email: member.email,
                })),
                description: group.description,
                decorators: groupDecorators,
            });
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
