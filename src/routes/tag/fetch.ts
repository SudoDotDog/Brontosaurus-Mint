/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Tag
 * @description Fetch
 */

import { INTERNAL_USER_GROUP, ITagModel, TagController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE } from "../../util/error";

export type FetchTagBody = {

    readonly page: number;
    readonly keyword: string;
};

export type FetchTagElement = {

    readonly active: boolean;
    readonly name: string;
    readonly description?: string;
};

export class FetchTagRoute extends BrontosaurusRoute {

    public readonly path: string = '/tag/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(this._fetchTagHandler.bind(this), 'Fetch Tags'),
    ];

    private async _fetchTagHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FetchTagBody> = Safe.extract(req.body as FetchTagBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const page: number = body.direct('page');
            if (typeof page !== 'number' || page < 0) {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'page', 'number', (page as any).toString());
            }

            const keyword: string = body.direct('keyword');
            if (typeof keyword !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'keyword', 'string', (keyword as any).toString());
            }

            const pages: number = await TagController.getSelectedTagPages(pageLimit, keyword);
            const tags: ITagModel[] = await TagController.getSelectedTagsByPage(pageLimit, Math.floor(page), keyword);

            const parsed: FetchTagElement[] = tags.map((tag: ITagModel) => ({

                active: tag.active,
                name: tag.name,
                description: tag.description,
            }));

            res.agent.add('tags', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
