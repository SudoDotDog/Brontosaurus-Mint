/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Global Background Image
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createListPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { isArray } from "util";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type GlobalBackgroundImagePreferenceRouteBody = {

    readonly globalBackgroundImages?: string[];
};

const bodyPattern: Pattern = createStrictMapPattern({

    globalBackgroundImages: createListPattern(
        createStringPattern(),
        {
            optional: true,
        },
    ),
});

export class GlobalBackgroundImagePreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/global-background-images';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._preferenceGlobalBackgroundImagesHandler.bind(this), 'Preference Global'),
    ];

    private async _preferenceGlobalBackgroundImagesHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: GlobalBackgroundImagePreferenceRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const globalBackgroundImages: string[] | undefined = body.globalBackgroundImages;

            let changed: number = 0;

            if (globalBackgroundImages) {
                if (!isArray(globalBackgroundImages)) {
                    throw this._error(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN);
                }
                await PreferenceController.setSinglePreference('globalBackgroundImages', globalBackgroundImages.map((value: any) => String(value)));
                changed++;
            }

            res.agent.add('changed', changed);
        } catch (err) {


            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {

            next();
        }
    }
}
