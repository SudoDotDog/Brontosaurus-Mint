/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Decorator
 * @description Fetch
 */

import { DecoratorController, IDecoratorModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE } from "../../util/error";
import { BrontosaurusRoute } from "../basic";

export type FetchDecoratorBody = {

    page: number;
    keyword: string;
};

export class FetchDecoratorRoute extends BrontosaurusRoute {

    public readonly path: string = '/decorator/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/decorator/fetch - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/decorator/fetch - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/decorator/fetch - GroupVerifyHandler'),
        basicHook.wrap(this._fetchDecoratorHandler.bind(this), '/decorator/fetch - Decorator Fetch', true),
    ];

    private async _fetchDecoratorHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<FetchDecoratorBody> = Safe.extract(req.body as FetchDecoratorBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

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
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
