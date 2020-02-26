/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Mailer Source
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type MailerSourcePreferenceRouteBody = {

    readonly resetPassword: string;
    readonly notification: string;
};

export class MailerSourcePreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/mailer-source';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/preference/mailer-source - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/preference/mailer-source - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/preference/mailer-source - GroupVerifyHandler'),
        basicHook.wrap(this._preferenceGlobalHandler.bind(this), '/preference/mailer-source - Global Mailer Source'),
    ];

    private async _preferenceGlobalHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: MailerSourcePreferenceRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const resetPassword: string | undefined = body.resetPassword;
            const notification: string | undefined = body.notification;

            let changed: number = 0;
            if (typeof resetPassword === 'string') {
                await PreferenceController.setSinglePreference('mailerSourceResetPassword', resetPassword);
                changed++;
            }

            if (typeof notification === 'string') {
                await PreferenceController.setSinglePreference('mailerSourceNotification', notification);
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