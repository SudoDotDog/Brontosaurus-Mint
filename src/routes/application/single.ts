/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Single
 */

import { ApplicationController, IApplicationModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { Throwable_MapGroups } from "../../util/auth";
import { ERROR_CODE } from "../../util/error";
import { BrontosaurusRoute } from "../basic";

export type SingleApplicationBody = {

    key: string;
};

export class SingleApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/application/single - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/application/single - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/application/single - GroupVerifyHandler'),
        basicHook.wrap(this._singleApplicationHandler.bind(this), '/application/single - Single', true),
    ];

    private async _singleApplicationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<SingleApplicationBody> = Safe.extract(req.body as SingleApplicationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const key: string = body.direct('key');
            if (typeof key !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'key', 'string', (key as any).toString());
            }

            const decoded: string = decodeURIComponent(key);
            const application: IApplicationModel | null = await ApplicationController.getApplicationByKey(decoded);
            if (!application) {
                throw this._error(ERROR_CODE.APPLICATION_KEY_NOT_FOUND, key);
            }

            const applicationGroups: string[] = await Throwable_MapGroups(application.groups);

            res.agent.add('application', {
                avatar: application.avatar,
                name: application.name,
                key: application.key,
                expire: application.expire,
                groups: applicationGroups,
                green: application.green,
            });
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
