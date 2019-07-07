/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Center
 */

import { PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { createAuthenticateHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";

export class CommandCenterPreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/command-center';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/preference/command-center - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/preference/command-center - AuthenticateHandler'),
        basicHook.wrap(this._preferenceGlobalHandler.bind(this), '/preference/command-center - Command Center', true),
    ];

    private async _preferenceGlobalHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            const commandCenterName: string = await PreferenceController.getSinglePreference('commandCenterName');

            res.agent.add('commandCenterName', commandCenterName);
        } catch (err) {

            res.agent.fail(400, err);
        } finally {

            next();
        }
    }
}
