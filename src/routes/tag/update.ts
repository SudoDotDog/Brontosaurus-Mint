/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Tag
 * @description Update
 */

import { INTERNAL_USER_GROUP, ITagModel, TagController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type UpdateTagBody = {

    name: string;
    description?: string;
};

export class UpdateTagRoute extends BrontosaurusRoute {

    public readonly path: string = '/tag/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/tag/update - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/tag/update - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/tag/update - GroupVerifyHandler'),
        basicHook.wrap(this._updateTagHandler.bind(this), '/tag/update - Update Tag', true),
    ];

    private async _updateTagHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<UpdateTagBody> = Safe.extract(req.body as UpdateTagBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const name: string = body.directEnsure('name');

            const tag: ITagModel | null = await TagController.getTagByName(name);

            if (!tag) {
                throw this._error(ERROR_CODE.TAG_NOT_FOUND, name);
            }

            const description: any = req.body.description;

            if (typeof description === 'string') {
                tag.description = description;
            }

            await tag.save();

            res.agent.add('tag', tag.name);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}