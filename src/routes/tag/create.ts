/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Tag
 * @description Create
 */

import { COMMON_NAME_VALIDATE_RESPONSE, INTERNAL_USER_GROUP, ITagModel, TagController, validateCommonName } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type CreateTagRouteBody = {

    name: string;
    description?: string;
};

export class CreateTagRoute extends BrontosaurusRoute {

    public readonly path: string = '/tag/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/tag/create - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/tag/create - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/tag/create - GroupVerifyHandler'),
        basicHook.wrap(this._tagCreateHandler.bind(this), '/tag/create - Create', true),
    ];

    private async _tagCreateHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<CreateTagRouteBody> = Safe.extract(req.body as CreateTagRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const name: string = body.direct('name');

            const validateResult: COMMON_NAME_VALIDATE_RESPONSE = validateCommonName(name);

            if (validateResult !== COMMON_NAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_NAME, validateResult);
            }

            const description: string | undefined = req.body.description;

            const isDuplicated: boolean = await TagController.isTagDuplicatedByName(name);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_TAG, name);
            }

            const tag: ITagModel = TagController.createUnsavedTag(name, description);
            await tag.save();

            res.agent.add('tag', tag.name);
        } catch (err) {

            res.agent.fail(400, err);
        } finally {

            next();
        }
    }
}