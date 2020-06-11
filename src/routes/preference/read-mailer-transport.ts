/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Read Mailer Transport
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export class ReadMailerTransportPreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/read/mailer-transport';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/preference/read/mailer-transport - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/preference/read/mailer-transport - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), '/preference/read/mailer-transport - GroupVerifyHandler'),
        basicHook.wrap(this._preferenceMailerTransportHandler.bind(this), '/preference/read/mailer-transport - Read Mailer Transport'),
    ];

    private async _preferenceMailerTransportHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const mailerTransport: any = await PreferenceController.getSinglePreference('mailerTransport');
            const stringified: string = JSON.stringify(mailerTransport);

            res.agent.addIfExist('config', stringified);
        } catch (err) {


            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {

            next();
        }
    }
}
