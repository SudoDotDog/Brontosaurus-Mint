/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Global
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { isArray } from "util";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type GlobalPreferenceRouteBody = {

    readonly globalAvatar?: string;
    readonly globalBackgroundImages?: string[];
    readonly globalFavicon?: string;
    readonly globalHelpLink?: string;
    readonly globalPrivacyPolicy?: string;
};

export class GlobalPreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/global';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/preference/global - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/preference/global - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/preference/global - GroupVerifyHandler'),
        basicHook.wrap(this._preferenceGlobalHandler.bind(this), '/preference/global - Global'),
    ];

    private async _preferenceGlobalHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: GlobalPreferenceRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const globalAvatar: string | undefined = body.globalAvatar;
            const globalBackgroundImages: string[] | undefined = body.globalBackgroundImages;
            const globalFavicon: string | undefined = body.globalFavicon;
            const globalHelpLink: string | undefined = body.globalHelpLink;
            const globalPrivacyPolicy: string | undefined = body.globalPrivacyPolicy;

            let changed: number = 0;
            if (typeof globalAvatar === 'string') {
                await PreferenceController.setSinglePreference('globalAvatar', globalAvatar.toString());
                changed++;
            }

            if (globalBackgroundImages) {
                if (!isArray(globalBackgroundImages)) {
                    throw this._error(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN);
                }
                await PreferenceController.setSinglePreference('globalBackgroundImages', globalBackgroundImages.map((value: any) => String(value)));
                changed++;
            }

            if (typeof globalFavicon === 'string') {
                await PreferenceController.setSinglePreference('globalFavicon', globalFavicon.toString());
                changed++;
            }

            if (typeof globalHelpLink === 'string') {
                await PreferenceController.setSinglePreference('globalHelpLink', globalHelpLink.toString());
                changed++;
            }

            if (typeof globalPrivacyPolicy === 'string') {
                await PreferenceController.setSinglePreference('globalPrivacyPolicy', globalPrivacyPolicy.toString());
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
