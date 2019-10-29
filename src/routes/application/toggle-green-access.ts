/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Toggle Green Access
 */

import { ApplicationController, IApplicationModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type ToggleGreenAccessApplicationBody = {

    readonly key: string;
};

export class ToggleGreenAccessApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/toggle-green-access';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), 'GroupVerifyHandler'),
        autoHook.wrap(this._toggleGreenAccessApplicationHandler.bind(this), 'Toggle Green Access', true),
    ];

    private async _toggleGreenAccessApplicationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<ToggleGreenAccessApplicationBody> = Safe.extract(req.body as ToggleGreenAccessApplicationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const key: string = body.direct('key');

            if (typeof key !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'key', 'string', (key as any).toString());
            }

            const application: IApplicationModel | null = await ApplicationController.getApplicationByKey(key);

            if (!application) {
                throw this._error(ERROR_CODE.APPLICATION_KEY_NOT_FOUND, key);
            }

            application.greenAccess = !Boolean(application.greenAccess);

            await application.save();

            res.agent.add('application', application.key);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
