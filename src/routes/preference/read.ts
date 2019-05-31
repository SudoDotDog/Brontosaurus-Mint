/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Red_Preference
 * @description Read
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../basic";

export class ReadPreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/read';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/preference/read - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/preference/read - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/preference/read - GroupVerifyHandler'),
        basicHook.wrap(this._preferenceGlobalHandler.bind(this), '/preference/read - Read', true),
    ];

    private async _preferenceGlobalHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            const globalAvatar: string | null = await PreferenceController.getSinglePreference('globalAvatar');
            const globalBackgroundImages: string[] | null = await PreferenceController.getSinglePreference('globalBackgroundImages');
            const globalHelpLink: string | null = await PreferenceController.getSinglePreference('globalHelpLink');
            const globalPrivacyPolicy: string | null = await PreferenceController.getSinglePreference('globalPrivacyPolicy');

            res.agent.addIfExist('globalAvatar', globalAvatar)
                .addIfExist('globalBackgroundImages', globalBackgroundImages)
                .addIfExist('globalHelpLink', globalHelpLink)
                .addIfExist('globalPrivacyPolicy', globalPrivacyPolicy);
        } catch (err) {

            res.agent.fail(400, err);
        } finally {

            next();
        }
    }
}
