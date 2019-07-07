/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Names
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";

export type NamePreferenceBody = {

    readonly systemName?: string;
    readonly accountName?: string;
    readonly commandCenterName?: string;
};

export class NamePreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/names';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/preference/names - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/preference/names - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/preference/names - GroupVerifyHandler'),
        basicHook.wrap(this._preferenceNamesHandler.bind(this), '/preference/names - Names', true),
    ];

    private async _preferenceNamesHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: NamePreferenceBody = req.body;

        try {

            const systemName: string | undefined = body.systemName;
            const accountName: string | undefined = body.accountName;
            const commandCenterName: string | undefined = body.commandCenterName;

            let changed: number = 0;
            if (systemName) {
                await PreferenceController.setSinglePreference('systemName', systemName.toString());
                changed++;
            }

            if (accountName) {
                await PreferenceController.setSinglePreference('accountName', accountName.toString());
                changed++;
            }

            if (commandCenterName) {
                await PreferenceController.setSinglePreference('commandCenterName', commandCenterName.toString());
                changed++;
            }

            res.agent.add('changed', changed);
        } catch (err) {

            res.agent.fail(400, err);
        } finally {

            next();
        }
    }
}
