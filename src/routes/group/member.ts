/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Group
 * @description Member
 */

import { AccountController, GroupController, IAccount, IGroupModel, INamespaceModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createNumberPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { getNamespaceMapByNamespaceIds } from "../../data/namespace";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE, panic } from "../../util/error";

export type GroupFetchMemberBody = {

    readonly group: string;
    readonly page: number;
};

const bodyPattern: Pattern = createStrictMapPattern({

    group: createStringPattern(),
    page: createNumberPattern({
        integer: true,
        minimum: 0,
    }),
});

export class GroupFetchMemberRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/members';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._groupFetchMemberHandler.bind(this), 'Fetch Group Member'),
    ];

    private async _groupFetchMemberHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: GroupFetchMemberBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const decoded: string = decodeURIComponent(body.group);
            const group: IGroupModel | null = await GroupController.getGroupByName(decoded);
            if (!group) {
                throw this._error(ERROR_CODE.GROUP_NOT_FOUND, decoded);
            }

            const accounts: IAccount[] = await AccountController.getAccountsByGroupAndPageLean(group._id, pageLimit, body.page);
            const pages: number = await AccountController.getAccountsByGroupPages(group._id, pageLimit);

            const namespaceMap: Map<string, INamespaceModel> = await getNamespaceMapByNamespaceIds(accounts.map((each) => each.namespace));

            res.agent.add('pages', pages);
            res.agent.add('members', accounts.map((member: IAccount) => ({
                active: member.active,
                username: member.username,
                namespace: namespaceMap.get(member.namespace.toHexString())?.namespace,
                displayName: member.displayName,
                phone: member.phone,
                email: member.email,
            })));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
