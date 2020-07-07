/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Center
 */

import { PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";

export class CommandCenterPreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/command-center';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(this._preferenceGlobalHandler.bind(this), 'Command Center'),
    ];

    private async _preferenceGlobalHandler(_: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            const commandCenterName: string | null = await PreferenceController.getSinglePreference('commandCenterName');
            const accountName: string | null = await PreferenceController.getSinglePreference('accountName');

            res.agent
                .add('existCommandCenterName', Boolean(commandCenterName))
                .add('existAccountName', Boolean(accountName))
                .addIfExist('accountName', accountName)
                .addIfExist('commandCenterName', commandCenterName);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {

            next();
        }
    }
}
