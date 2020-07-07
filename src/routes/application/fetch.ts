/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Fetch
 */

import { ApplicationController, ApplicationRedirection, IApplicationModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE } from "../../util/error";

export type FetchApplicationBody = {

    readonly page: number;
    readonly keyword: string;
};

export type FetchApplicationElement = {

    readonly active: boolean;
    readonly expire: number;
    readonly key: string;
    readonly name: string;
    readonly greenAccess: boolean;
    readonly portalAccess: boolean;

    readonly redirections: ApplicationRedirection[];
    readonly iFrameProtocol: boolean;
    readonly postProtocol: boolean;
    readonly alertProtocol: boolean;
    readonly noneProtocol: boolean;
};

export class FetchApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(this._fetchApplicationHandler.bind(this), 'Fetch Applications'),
    ];

    private async _fetchApplicationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FetchApplicationBody> = Safe.extract(req.body as FetchApplicationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const page: number = body.direct('page');
            if (typeof page !== 'number' || page < 0) {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'page', 'number', (page as any).toString());
            }

            const keyword: string = body.direct('keyword');
            if (typeof keyword !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'keyword', 'string', (keyword as any).toString());
            }

            const pages: number = await ApplicationController.getSelectedApplicationPages(pageLimit, keyword);
            const applications: IApplicationModel[] = await ApplicationController.getSelectedApplicationsByPage(pageLimit, Math.floor(page), keyword);

            const parsed: FetchApplicationElement[] = applications.map((application: IApplicationModel) => ({

                active: application.active,
                name: application.name,
                key: application.key,

                expire: application.expire,
                greenAccess: application.greenAccess,
                portalAccess: application.portalAccess,

                redirections: application.redirections,
                iFrameProtocol: application.iFrameProtocol,
                postProtocol: application.postProtocol,
                alertProtocol: application.alertProtocol,
                noneProtocol: application.noneProtocol,
            }));

            res.agent.add('applications', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
