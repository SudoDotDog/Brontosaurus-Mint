/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Tag
 * @description Update
 */

import { INTERNAL_USER_GROUP, ITagModel, TagController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type UpdateTagBody = {

    readonly name: string;
    readonly description?: string;
};

export class UpdateTagRoute extends BrontosaurusRoute {

    public readonly path: string = '/tag/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'GroupVerifyHandler'),
        autoHook.wrap(this._updateTagHandler.bind(this), 'Update Tag'),
    ];

    private async _updateTagHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<UpdateTagBody> = Safe.extract(req.body as UpdateTagBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

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

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
