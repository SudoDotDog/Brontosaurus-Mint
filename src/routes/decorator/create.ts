/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Decorator
 * @description Create
 */

import { COMMON_NAME_VALIDATE_RESPONSE, DecoratorController, IDecoratorModel, INTERNAL_USER_GROUP, validateCommonName } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";
import { ERROR_CODE } from "../../util/error";

export type CreateDecoratorBody = {

    name: string;
    description?: string;
};

export class CreateDecoratorRoute extends BrontosaurusRoute {

    public readonly path: string = '/decorator/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/decorator/create - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/decorator/create - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/decorator/create - GroupVerifyHandler'),
        basicHook.wrap(this._decoratorCreateHandler.bind(this), '/decorator/create - Decorator Create', true),
    ];

    private async _decoratorCreateHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<CreateDecoratorBody> = Safe.extract(req.body as CreateDecoratorBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const name: string = body.direct('name');

            const validateResult: COMMON_NAME_VALIDATE_RESPONSE = validateCommonName(name);

            if (validateResult !== COMMON_NAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_NAME, validateResult);
            }

            const description: string | undefined = req.body.description;

            const isDuplicated: boolean = await DecoratorController.isDecoratorDuplicatedByName(name);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_DECORATOR, name);
            }

            const decorator: IDecoratorModel = DecoratorController.createUnsavedDecorator(name, description);

            await decorator.save();

            res.agent.add('decorator', decorator.name);
        } catch (err) {

            res.agent.fail(400, err);
        } finally {

            next();
        }
    }
}
