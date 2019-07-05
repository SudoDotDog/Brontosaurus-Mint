/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Refresh Green
 */

import { ApplicationController, IApplicationModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";
import { BrontosaurusRoute } from "../basic";

export type RefreshGreenApplicationBody = {

    key: string;
};

export class RefreshGreenApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/refresh-green';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/application/refresh-green - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/application/refresh-green - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/application/refresh-green - GroupVerifyHandler'),
        basicHook.wrap(this._refreshGreenApplicationHandler.bind(this), '/application/refresh-green - Refresh Green', true),
    ];

    private async _refreshGreenApplicationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<RefreshGreenApplicationBody> = Safe.extract(req.body as RefreshGreenApplicationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const key: string = body.direct('key');

            if (typeof key !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'key', 'string', (key as any).toString());
            }

            const application: IApplicationModel | null = await ApplicationController.getApplicationByKey(key);

            if (!application) {
                throw this._error(ERROR_CODE.APPLICATION_KEY_NOT_FOUND, key);
            }

            application.refreshGreen();

            await application.save();

            res.agent.add('application', application.key);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
