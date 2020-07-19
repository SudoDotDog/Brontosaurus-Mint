/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Decorator
 * @description Activate
 */

import { DecoratorController, IDecoratorModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type DecoratorActivateRouteBody = {

    readonly decorator: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    decorator: createStringPattern(),
});

export class DecoratorActivateRoute extends BrontosaurusRoute {

    public readonly path: string = '/decorator/activate';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._activateDecoratorHandler.bind(this), 'Activate Decorator'),
    ];

    private async _activateDecoratorHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: DecoratorActivateRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const decorator: IDecoratorModel | null = await DecoratorController.getDecoratorByName(body.decorator);

            if (!decorator) {
                throw panic.code(ERROR_CODE.DECORATOR_NOT_FOUND, body.decorator);
            }

            if (decorator.active) {
                throw this._error(ERROR_CODE.ALREADY_ACTIVATED, body.decorator);
            }

            decorator.active = true;
            await decorator.save();

            res.agent.add('activated', decorator.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}