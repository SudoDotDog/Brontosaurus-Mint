/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Decorator
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

export type UpdateDecoratorBody = {

    readonly name: string;
    readonly description?: string;
    readonly addableGroups: string[];
    readonly removableGroups: string[];
};

const bodyPattern: Pattern = createStrictMapPattern({

    name: createStringPattern(),
    description: createStringPattern({
        optional: true,
    }),
    addableGroups: createListPattern(
        createStringPattern(),
    ),
    removableGroups: createListPattern(
        createStringPattern(),
    ),
});

export class UpdateDecoratorRoute extends BrontosaurusRoute {

    public readonly path: string = '/decorator/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._updateDecoratorHandler.bind(this), 'Update Decorator'),
    ];

    private async _updateDecoratorHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: UpdateDecoratorBody = req.body;

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

            const decorator: IDecoratorModel | null = await DecoratorController.getDecoratorByName(body.name);

            if (!decorator) {
                throw this._error(ERROR_CODE.DECORATOR_NOT_FOUND, name);
            }

            const addableGroups: IGroupModel[] = await GroupController.getGroupByNames(body.addableGroups);
            const removableGroups: IGroupModel[] = await GroupController.getGroupByNames(body.removableGroups);

            const description: any = body.description;

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
