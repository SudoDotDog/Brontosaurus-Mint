/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Group
 * @description Create
 */

import { COMMON_NAME_VALIDATE_RESPONSE, GroupController, IGroupModel, INTERNAL_USER_GROUP, validateCommonName } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type CreateGroupRouteBody = {

    readonly name: string;
    readonly description?: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    name: createStringPattern(),
    description: createStringPattern({
        optional: true,
    }),
});

export class CreateGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._groupCreateHandler.bind(this), 'Create Group'),
    ];

    private async _groupCreateHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: CreateGroupRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(
                    ERROR_CODE.REQUEST_DOES_MATCH_PATTERN,
                    verify.invalids[0],
                );
            }

            const validateResult: COMMON_NAME_VALIDATE_RESPONSE = validateCommonName(body.name);

            if (validateResult !== COMMON_NAME_VALIDATE_RESPONSE.OK) {
                throw this._error(
                    ERROR_CODE.INVALID_COMMON_NAME,
                    validateResult,
                );
            }

            const isDuplicated: boolean = await GroupController.isGroupDuplicatedByName(body.name);

            if (isDuplicated) {
                throw this._error(
                    ERROR_CODE.DUPLICATE_GROUP,
                    body.name,
                );
            }

            const group: IGroupModel = GroupController.createUnsavedGroup(
                body.name,
                body.description,
            );
            await group.save();

            res.agent.add('group', group.name);
        } catch (err) {


            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {

            next();
        }
    }
}
