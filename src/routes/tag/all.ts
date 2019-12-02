/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Tag
 * @description All
 */

import { INTERNAL_USER_GROUP, ITagModel, TagController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export class AllTagRoute extends BrontosaurusRoute {

    public readonly path: string = '/tag/all';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/tag/all - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/tag/all - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/tag/all - GroupVerifyHandler'),
        basicHook.wrap(this._allTagHandler.bind(this), '/tag/all - All Tags', true),
    ];

    private async _allTagHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const tags: ITagModel[] = await TagController.getAllActiveTags();

            const parsed = tags.map((tag: ITagModel) => ({
                name: tag.name,
                description: tag.description,
            }));

            res.agent.add('tags', parsed);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
