/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Read Names
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export class ReadNamesPreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/read/names';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/preference/read/names - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/preference/read/names - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/preference/read/names - GroupVerifyHandler'),
        basicHook.wrap(this._preferenceNamesHandler.bind(this), '/preference/read/names - Read Names', true),
    ];

    private async _preferenceNamesHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const accountName: string | null = await PreferenceController.getSinglePreference('accountName');
            const systemName: string | null = await PreferenceController.getSinglePreference('systemName');
            const commandCenterName: string | null = await PreferenceController.getSinglePreference('commandCenterName');

            res.agent.addIfExist('accountName', accountName)
                .addIfExist('commandCenterName', commandCenterName)
                .addIfExist('systemName', systemName);
        } catch (err) {


            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {

            next();
        }
    }
}
