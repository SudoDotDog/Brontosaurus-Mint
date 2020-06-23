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
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type GlobalPreferenceRouteBody = {

    readonly globalAvatar?: string;
    readonly globalBackgroundImages?: string[];
    readonly globalFavicon?: string;
    readonly globalHelpLink?: string;
    readonly globalPrivacyPolicy?: string;

    readonly indexPage?: string;
    readonly entryPage?: string;
};

export class GlobalPreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/global';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'GroupVerifyHandler'),
        autoHook.wrap(this._preferenceGlobalHandler.bind(this), 'Preference Global'),
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

            const indexPage: string | undefined = body.indexPage;
            const entryPage: string | undefined = body.entryPage;

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

            if (typeof indexPage === 'string') {
                await PreferenceController.setSinglePreference('indexPage', indexPage.toString());
                changed++;
            }

            if (typeof entryPage === 'string') {
                await PreferenceController.setSinglePreference('entryPage', entryPage.toString());
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
