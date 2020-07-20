/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Group
 * @description Fetch
 */

import { GroupController, IGroupModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createIntegerPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE, panic } from "../../util/error";

export type FetchGroupBody = {

    readonly page: number;
    readonly keyword: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    page: createIntegerPattern({
        minimum: 0,
    }),
    keyword: createStringPattern(),
});

export type GroupResponse = {

    readonly active: boolean;
    readonly name: string;
    readonly decorators: number;
    readonly description?: string;
};

export class FetchGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._fetchGroupHandler.bind(this), 'Fetch Group'),
    ];

    private async _fetchGroupHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: FetchGroupBody = req.body;

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

            const pages: number = await GroupController.getSelectedGroupPages(
                pageLimit,
                body.keyword,
            );
            const groups: IGroupModel[] = await GroupController.getSelectedGroupsByPage(
                pageLimit,
                body.page,
                body.keyword,
            );

            const parsed: GroupResponse[] = groups.map((group: IGroupModel) => ({
                active: group.active,
                name: group.name,
                description: group.description,
                decorators: group.decorators.length,
            }));

            res.agent.add('groups', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
