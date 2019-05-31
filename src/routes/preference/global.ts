/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Red_Preference
 * @description Global
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { isArray } from "util";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";
import { ERROR_CODE } from "../../util/error";

export type GlobalPreferenceRouteBody = {

    readonly globalAvatar: string;
    readonly globalBackgroundImages: string[];
    readonly globalHelpLink: string;
    readonly globalPrivacyPolicy: string;
};

export class GlobalPreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/global';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/preference/global - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/preference/global - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/preference/global - GroupVerifyHandler'),
        basicHook.wrap(this._preferenceGlobalHandler.bind(this), '/preference/global - Global', true),
    ];

    private async _preferenceGlobalHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<GlobalPreferenceRouteBody> = Safe.extract(req.body as GlobalPreferenceRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const globalAvatar: string = body.direct('globalAvatar');
            const globalBackgroundImages: string[] = body.direct('globalBackgroundImages');
            const globalHelpLink: string = body.direct('globalHelpLink');
            const globalPrivacyPolicy: string = body.direct('globalPrivacyPolicy');

            if (!isArray(globalBackgroundImages)) {
                throw this._error(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN);
            }

            await PreferenceController.setSinglePreference('globalAvatar', globalAvatar.toString());
            await PreferenceController.setSinglePreference('globalBackgroundImages', globalBackgroundImages.map((value: any) => value.toString()));
            await PreferenceController.setSinglePreference('globalHelpLink', globalHelpLink.toString());
            await PreferenceController.setSinglePreference('globalPrivacyPolicy', globalPrivacyPolicy.toString());

            res.agent.add('status', 'done');
        } catch (err) {

            res.agent.fail(400, err);
        } finally {

            next();
        }
    }
}
