/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Fetch
 */

import { ApplicationController, IApplicationModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE } from "../../util/error";

export type FetchApplicationBody = {

    page: number;
    keyword: string;
};

export class FetchApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/application/fetch - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/application/fetch - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/application/fetch - GroupVerifyHandler'),
        basicHook.wrap(this._fetchApplicationHandler.bind(this), '/application/fetch - All', true),
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

            const pages: number = await ApplicationController.getSelectedActiveApplicationPages(pageLimit, keyword);
            const applications: IApplicationModel[] = await ApplicationController.getSelectedActiveApplicationsByPage(pageLimit, Math.floor(page), keyword);

            const parsed = applications.map((application: IApplicationModel) => ({
                expire: application.expire,
                key: application.key,
                name: application.name,
                greenAccess: application.greenAccess,
                portalAccess: application.portalAccess,
            }));

            res.agent.add('applications', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
