/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Decorator
 * @description All
 */

import { DecoratorController, IDecoratorModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";

export class AllDecoratorRoute extends BrontosaurusRoute {

    public readonly path: string = '/decorator/all';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/decorator/all - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/decorator/all - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/decorator/all - GroupVerifyHandler'),
        basicHook.wrap(this._allDecoratorHandler.bind(this), '/decorator/all - All Decorators', true),
    ];

    private async _allDecoratorHandler(_: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            const decorators: IDecoratorModel[] = await DecoratorController.getAllActiveDecorators();

            const parsed = decorators.map((decorator: IDecoratorModel) => ({
                name: decorator.name,
                description: decorator.description,
            }));

            res.agent.add('decorators', parsed);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
