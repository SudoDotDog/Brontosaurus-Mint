/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Group
 * @description Update
 */

import { DecoratorController, GroupController, IDecoratorModel, IGroupModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createListPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type UpdateGroupBody = {

    readonly name: string;
    readonly description?: string;
    readonly decorators: string[];
};

const bodyPattern: Pattern = createStrictMapPattern({

    name: createStringPattern(),
    description: createStringPattern({
        optional: true,
    }),
    decorators: createListPattern(
        createStringPattern(),
    ),
});

export class UpdateGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._updateGroupHandler.bind(this), 'Update Group'),
    ];

    private async _updateGroupHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: UpdateGroupBody = req.body;

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

            const group: IGroupModel | null = await GroupController.getGroupByName(body.name);

            if (!group) {
                throw this._error(ERROR_CODE.GROUP_NOT_FOUND, body.name);
            }

            const decorators: IDecoratorModel[] = await DecoratorController.getDecoratorByNames(body.decorators);

            if (typeof body.description === 'string') {
                group.description = body.description;
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
