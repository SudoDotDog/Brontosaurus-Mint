/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Single
 */

import { ApplicationController, IApplicationModel, INTERNAL_USER_GROUP, ApplicationRedirection } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
// eslint-disable-next-line camelcase
import { Throwable_MapGroups, Throwable_MapTags } from "../../util/auth";
import { ERROR_CODE } from "../../util/error";

export type SingleApplicationBody = {

    readonly key: string;
};

export type SingleApplicationFetchResponse = {

    readonly active: boolean;
    readonly avatar?: string;
    readonly favicon?: string;
    readonly name: string;
    readonly key: string;
    readonly expire: number;

    readonly redirections: ApplicationRedirection[];
    readonly iFrameProtocol: boolean;
    readonly postProtocol: boolean;
    readonly alertProtocol: boolean;
    readonly noneProtocol: boolean;

    readonly green: string;
    readonly greenAccess: boolean;
    readonly portalAccess: boolean;
    readonly publicKey: string;

    readonly groups: string[];
    readonly requires: string[];
    readonly requireTags: string[];
};

export class SingleApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(this._singleApplicationHandler.bind(this), 'Single Application'),
    ];

    private async _singleApplicationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<SingleApplicationBody> = Safe.extract(req.body as SingleApplicationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

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
            const applicationRequires: string[] = await Throwable_MapGroups(application.requires);
            const applicationRequireTags: string[] = await Throwable_MapTags(application.requireTags);

            const response: SingleApplicationFetchResponse = {

                active: application.active,
                name: application.name,
                key: application.key,

                avatar: application.avatar,
                favicon: application.favicon,
                expire: application.expire,

                redirections: application.redirections,
                iFrameProtocol: application.iFrameProtocol,
                postProtocol: application.postProtocol,
                alertProtocol: application.alertProtocol,
                noneProtocol: application.noneProtocol,

                green: application.green,
                greenAccess: application.greenAccess,
                portalAccess: application.portalAccess,
                publicKey: application.publicKey,

                groups: applicationGroups,
                requires: applicationRequires,
                requireTags: applicationRequireTags,
            };

            res.agent.add('application', response);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
