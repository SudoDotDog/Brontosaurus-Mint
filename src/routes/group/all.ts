/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Group
 * @description All
 */

import { GroupController, IGroupModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../basic";

export class AllGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/all';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/group/all - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/group/all - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/group/all - GroupVerifyHandler'),
        basicHook.wrap(this._allGroupHandler.bind(this), '/group/all - All Groups', true),
    ];

    private async _allGroupHandler(_: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            const groups: IGroupModel[] = await GroupController.getAllActiveGroups();

            const parsed = groups.map((group: IGroupModel) => ({
                name: group.name,
                description: group.description,
            }));

            res.agent.add('groups', parsed);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
