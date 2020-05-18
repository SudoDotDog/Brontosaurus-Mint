/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Group
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

export type UpdateGroupBody = {

    readonly name: string;
    readonly description?: string;
    readonly decorators: string[];
};

export class UpdateGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/group/update - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/group/update - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/group/update - GroupVerifyHandler'),
        basicHook.wrap(this._updateGroupHandler.bind(this), '/group/update - Update Group'),
    ];

    private async _updateGroupHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<UpdateGroupBody> = Safe.extract(req.body as UpdateGroupBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const name: string = body.directEnsure('name');
            const decoratorsNames: string[] = body.direct('decorators');

            const group: IGroupModel | null = await GroupController.getGroupByName(name);

            if (!group) {
                throw this._error(ERROR_CODE.GROUP_NOT_FOUND, name);
            }

            const decorators: IDecoratorModel[] = await DecoratorController.getDecoratorByNames(decoratorsNames);

            const description: any = req.body.description;

            if (typeof description === 'string') {
                group.description = description;
            }

            group.decorators = decorators.map((decorator: IDecoratorModel) => decorator._id);

            await group.save();

            res.agent.add('group', group.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
