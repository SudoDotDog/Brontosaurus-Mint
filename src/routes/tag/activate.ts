/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Tag
 * @description Activate
 */

import { TagController, ITagModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type TagActivateRouteBody = {

    readonly tag: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    tag: createStringPattern(),
});

export class TagActivateRoute extends BrontosaurusRoute {

    public readonly path: string = '/tag/activate';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._activateTagHandler.bind(this), 'Activate Tag'),
    ];

    private async _activateTagHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: TagActivateRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const tag: ITagModel | null = await TagController.getTagByName(body.tag);

            if (!tag) {
                throw panic.code(ERROR_CODE.TAG_NOT_FOUND, body.tag);
            }

            if (tag.active) {
                throw this._error(ERROR_CODE.ALREADY_ACTIVATED, body.tag);
            }

            tag.active = true;
            await tag.save();

            res.agent.add('activated', tag.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
