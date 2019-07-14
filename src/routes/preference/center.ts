/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Center
 */

import { PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";

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

            const commandCenterName: string | null = await PreferenceController.getSinglePreference('commandCenterName');
            const accountName: string | null = await PreferenceController.getSinglePreference('accountName');

            res.agent
                .add('existCommandCenterName', Boolean(commandCenterName))
                .add('existAccountName', Boolean(accountName))
                .addIfExist('accountName', accountName)
                .addIfExist('commandCenterName', commandCenterName);
        } catch (err) {

            res.agent.fail(400, err);
        } finally {

            next();
        }
    }
}
