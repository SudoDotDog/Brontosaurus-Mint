/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Read Global
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export class ReadGlobalPreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/read/global';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/preference/read/global - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/preference/read/global - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/preference/read/global - GroupVerifyHandler'),
        basicHook.wrap(this._preferenceGlobalHandler.bind(this), '/preference/read/global - Read Global'),
    ];

    private async _preferenceGlobalHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const globalAvatar: string | null = await PreferenceController.getSinglePreference('globalAvatar');
            const globalBackgroundImages: string[] | null = await PreferenceController.getSinglePreference('globalBackgroundImages');
            const globalFavicon: string | null = await PreferenceController.getSinglePreference('globalFavicon');
            const globalHelpLink: string | null = await PreferenceController.getSinglePreference('globalHelpLink');
            const globalPrivacyPolicy: string | null = await PreferenceController.getSinglePreference('globalPrivacyPolicy');

            res.agent.addIfExist('globalAvatar', globalAvatar)
                .addIfExist('globalBackgroundImages', globalBackgroundImages)
                .addIfExist('globalFavicon', globalFavicon)
                .addIfExist('globalHelpLink', globalHelpLink)
                .addIfExist('globalPrivacyPolicy', globalPrivacyPolicy);
        } catch (err) {


            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {

            next();
        }
    }
}
