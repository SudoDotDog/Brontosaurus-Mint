/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Decorator
 * @description Single
 */

import { DecoratorController, IDecoratorModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { Throwable_MapGroups } from "../../util/auth";
import { ERROR_CODE } from "../../util/error";
import { BrontosaurusRoute } from "../basic";

export type SingleDecoratorBody = {

    name: string;
};

export class SingleDecoratorRoute extends BrontosaurusRoute {

    public readonly path: string = '/decorator/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/decorator/single - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/decorator/single - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/decorator/single - GroupVerifyHandler'),
        basicHook.wrap(this._singleDecoratorHandler.bind(this), '/decorator/single - Decorator Single', true),
    ];

    private async _singleDecoratorHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<SingleDecoratorBody> = Safe.extract(req.body as SingleDecoratorBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const name: string = body.direct('name');
            if (typeof name !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'name', 'string', (name as any).toString());
            }

            const decorator: IDecoratorModel | null = await DecoratorController.getDecoratorByName(name);
            if (!decorator) {
                throw this._error(ERROR_CODE.DECORATOR_NOT_FOUND, name);
            }

            const addableGroups: string[] = await Throwable_MapGroups(decorator.addableGroups);
            const removableGroups: string[] = await Throwable_MapGroups(decorator.removableGroups);

            res.agent.migrate({
                name: decorator.name,
                addableGroups,
                removableGroups,
            });

            if (decorator.description) {
                res.agent.add('description', decorator.description);
            }
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}