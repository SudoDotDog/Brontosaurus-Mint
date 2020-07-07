/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Deactivate
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

export type ApplicationDeactivateRouteBody = {

    readonly application: string;
};

export const bodyPattern: Pattern = createStrictMapPattern({

    application: createStringPattern(),
});

export class ApplicationDeactivateRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/deactivate';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._deactivateApplicationHandler.bind(this), 'Deactivate Application'),
    ];

    private async _deactivateApplicationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: ApplicationDeactivateRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const application: IApplicationModel | null = await ApplicationController.getApplicationByKey(body.application);

            if (!application) {
                throw panic.code(ERROR_CODE.APPLICATION_NOT_FOUND, body.application);
            }

            if (!application.active) {
                throw this._error(ERROR_CODE.ALREADY_DEACTIVATED, body.application);
            }

            application.active = false;
            await application.save();

            res.agent.add('deactivated', application.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
