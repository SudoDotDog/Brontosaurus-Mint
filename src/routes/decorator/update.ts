/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Decorator
 * @description Update
 */

import { DecoratorController, GroupController, IDecoratorModel, IGroupModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type UpdateDecoratorBody = {

    name: string;
    description?: string;
    addableGroups: string[];
    removableGroups: string[];
};

export class UpdateDecoratorRoute extends BrontosaurusRoute {

    public readonly path: string = '/decorator/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/decorator/update - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/decorator/update - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/decorator/update - GroupVerifyHandler'),
        basicHook.wrap(this._updateDecoratorHandler.bind(this), '/decorator/update - Update Decorator'),
    ];

    private async _updateDecoratorHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<UpdateDecoratorBody> = Safe.extract(req.body as UpdateDecoratorBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const name: string = body.directEnsure('name');
            const addable: string[] = body.direct('addableGroups');
            const removable: string[] = body.direct('removableGroups');

            const decorator: IDecoratorModel | null = await DecoratorController.getDecoratorByName(name);

            if (!decorator) {
                throw this._error(ERROR_CODE.DECORATOR_NOT_FOUND, name);
            }

            const addableGroups: IGroupModel[] = await GroupController.getGroupByNames(addable);
            const removableGroups: IGroupModel[] = await GroupController.getGroupByNames(removable);

            const description: any = req.body.description;

            if (typeof description === 'string') {
                decorator.description = description;
            }

            decorator.addableGroups = addableGroups.map((group: IGroupModel) => group._id);
            decorator.removableGroups = removableGroups.map((group: IGroupModel) => group._id);

            await decorator.save();

            res.agent.add('decorator', decorator.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
