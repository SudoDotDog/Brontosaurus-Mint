/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Group
 * @description Create
 */

import { COMMON_NAME_VALIDATE_RESPONSE, GroupController, IGroupModel, INTERNAL_USER_GROUP, validateCommonName } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type CreateGroupRouteBody = {

    name: string;
    description?: string;
};

export class CreateGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/group/create - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/group/create - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/group/create - GroupVerifyHandler'),
        basicHook.wrap(this._groupCreateHandler.bind(this), '/group/create - Create', true),
    ];

    private async _groupCreateHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<CreateGroupRouteBody> = Safe.extract(req.body as CreateGroupRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const name: string = body.direct('name');

            const validateResult: COMMON_NAME_VALIDATE_RESPONSE = validateCommonName(name);

            if (validateResult !== COMMON_NAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_NAME, validateResult);
            }

            const description: string | undefined = req.body.description;

            const isDuplicated: boolean = await GroupController.isGroupDuplicatedByName(name);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_GROUP, name);
            }

            const group: IGroupModel = GroupController.createUnsavedGroup(name, description);
            await group.save();

            res.agent.add('group', group.name);
        } catch (err) {

            res.agent.fail(400, err);
        } finally {

            next();
        }
    }
}
