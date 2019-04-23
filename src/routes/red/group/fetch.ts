/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Red_Group
 * @description Fetch
 */

import { GroupController, IGroupModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../../handlers/handlers";
import { basicHook } from "../../../handlers/hook";
import { ERROR_CODE } from "../../../util/error";
import { BrontosaurusRoute } from "../../basic";

export type FetchGroupBody = {

    page: number;
    keyword: string;
};

export class FetchGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/group/fetch - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/group/fetch - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/group/fetch - GroupVerifyHandler'),
        basicHook.wrap(this._fetchGroupHandler.bind(this), '/group/fetch - Fetch', true),
    ];

    private async _fetchGroupHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FetchGroupBody> = Safe.extract(req.body as FetchGroupBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const page: number = body.direct('page');
            if (typeof page !== 'number' || page < 0) {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'page', 'number', (page as any).toString());
            }

            const keyword: string = body.direct('keyword');
            if (typeof keyword !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'keyword', 'string', (keyword as any).toString());
            }

            const limit: number = 10;

            const pages: number = await GroupController.getTotalActiveGroupPages(limit);
            const groups: IGroupModel[] = await GroupController.getSelectedActiveGroupsByPage(limit, Math.floor(page), keyword);

            const parsed = groups.map((group: IGroupModel) => ({
                name: group.name,
            }));

            res.agent.add('groups', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
