/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Read Mailer Source
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export class ReadMailerSourcePreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/read/mailer-source';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/preference/read/mailer-source - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/preference/read/mailer-source - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/preference/read/mailer-source - GroupVerifyHandler'),
        basicHook.wrap(this._preferenceMailerSourceHandler.bind(this), '/preference/read/mailer-source - Read Mailer Source'),
    ];

    private async _preferenceMailerSourceHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const resetPassword: string | null = await PreferenceController.getSinglePreference('mailerSourceResetPassword');
            const notification: string | null = await PreferenceController.getSinglePreference('mailerSourceNotification');

            res.agent.addIfExist('resetPassword', resetPassword);
            res.agent.addIfExist('notification', notification);
        } catch (err) {


            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {

            next();
        }
    }
}
