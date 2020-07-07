/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Decorator
 * @description All
 */

import { DecoratorController, IDecoratorModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export class AllDecoratorRoute extends BrontosaurusRoute {

    public readonly path: string = '/decorator/all';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.GET;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(this._allDecoratorHandler.bind(this), 'Fetch All Decorators'),
    ];

    private async _allDecoratorHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const decorators: IDecoratorModel[] = await DecoratorController.getAllActiveDecorators();

            const parsed = decorators.map((decorator: IDecoratorModel) => ({
                name: decorator.name,
                description: decorator.description,
            }));

            res.agent.add('decorators', parsed);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
