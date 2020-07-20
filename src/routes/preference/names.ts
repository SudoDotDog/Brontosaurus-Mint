/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Preference
 * @description Names
 */

import { INTERNAL_USER_GROUP, PreferenceController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type NamePreferenceBody = {

    readonly systemName?: string;
    readonly accountName?: string;
    readonly commandCenterName?: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    systemName: createStringPattern({
        optional: true,
    }),
    accountName: createStringPattern({
        optional: true,
    }),
    commandCenterName: createStringPattern({
        optional: true,
    }),
});

export class NamePreferenceRoute extends BrontosaurusRoute {

    public readonly path: string = '/preference/names';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._preferenceNamesHandler.bind(this), 'Preference Names'),
    ];

    private async _preferenceNamesHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: NamePreferenceBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(
                    ERROR_CODE.REQUEST_DOES_MATCH_PATTERN,
                    verify.invalids[0],
                );
            }

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


            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {

            next();
        }
    }
}
