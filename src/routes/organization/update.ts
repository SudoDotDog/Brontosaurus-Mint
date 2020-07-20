/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Update
 */

import { DecoratorController, IDecoratorModel, INTERNAL_USER_GROUP, IOrganizationModel, ITagModel, OrganizationController, TagController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createIntegerPattern, createListPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type UpdateOrganizationBody = {

    readonly name: string;
    readonly limit: number;
    readonly tags: string[];
    readonly decorators: string[];
};

const bodyPattern: Pattern = createStrictMapPattern({

    name: createStringPattern(),
    limit: createIntegerPattern({
        minimum: 1,
    }),
    tags: createListPattern(
        createStringPattern(),
    ),
    decorators: createListPattern(
        createStringPattern(),
    ),
});

export class UpdateOrganizationRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._updateOrganizationHandler.bind(this), 'Update Organization'),
    ];

    private async _updateOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: UpdateOrganizationBody = req.body;

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

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(body.name);

            if (!organization) {
                throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, body.name);
            }

            const decorators: IDecoratorModel[] = await DecoratorController.getDecoratorByNames(body.decorators);
            const tags: ITagModel[] = await TagController.getTagByNames(body.tags);

            if (typeof body.limit === 'number') {
                organization.limit = body.limit;
            }

            organization.decorators = decorators.map((decorator: IDecoratorModel) => decorator._id);
            organization.tags = tags.map((tag: ITagModel) => tag._id);

            await organization.save();

            res.agent.add('organization', organization.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
