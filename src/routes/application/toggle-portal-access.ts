/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Toggle Portal Access
 */

import { ApplicationController, IApplicationModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type TogglePortalAccessApplicationBody = {

    readonly key: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    key: createStringPattern(),
});

export class TogglePortalAccessApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/toggle-portal-access';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._togglePortalAccessApplicationHandler.bind(this), 'Toggle Portal Access'),
    ];

    private async _togglePortalAccessApplicationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: TogglePortalAccessApplicationBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const application: IApplicationModel | null = await ApplicationController.getApplicationByKey(body.key);

            if (!application) {
                throw this._error(
                    ERROR_CODE.APPLICATION_KEY_NOT_FOUND,
                    body.key,
                );
            }

            application.togglePortalAccess();
            await application.save();

            res.agent.add('application', application.key);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
