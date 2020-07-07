/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Decorator
 * @description Fetch
 */

import { DecoratorController, IDecoratorModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE } from "../../util/error";

export type FetchDecoratorBody = {

    readonly page: number;
    readonly keyword: string;
};

export class FetchDecoratorRoute extends BrontosaurusRoute {

    public readonly path: string = '/decorator/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(this._fetchDecoratorHandler.bind(this), 'Fetch Decorator'),
    ];

    private async _fetchDecoratorHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FetchDecoratorBody> = Safe.extract(req.body as FetchDecoratorBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

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

            const pages: number = await DecoratorController.getSelectedActiveDecoratorPages(pageLimit, keyword);
            const decorators: IDecoratorModel[] = await DecoratorController.getSelectedActiveDecoratorsByPage(pageLimit, Math.floor(page), keyword);

            const parsed = decorators.map((decorator: IDecoratorModel) => ({
                name: decorator.name,
                description: decorator.description,
            }));

            res.agent.add('decorators', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
