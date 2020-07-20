/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Group
 * @description Single
 */

import { GroupController, IAccount, IGroupModel, INamespaceModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { getAccountsByGroupLean } from "@brontosaurus/db/controller/account";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { getNamespaceMapByNamespaceIds } from "../../data/namespace";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { Throwable_MapDecorators } from "../../util/auth";
import { ERROR_CODE, panic } from "../../util/error";

export type SingleGroupBody = {

    readonly name: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    name: createStringPattern(),
});

export type SingleGroupResponse = {

    readonly active: boolean;
    readonly name: string;
    readonly members: Array<{
        readonly active: boolean;
        readonly username: string;
        readonly namespace: string;
        readonly phone?: string;
        readonly email?: string;
        readonly displayName?: string;
    }>;
    readonly description?: string;
    readonly decorators: string[];
};

export class SingleGroupRoute extends BrontosaurusRoute {

    public readonly path: string = '/group/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._singleGroupHandler.bind(this), 'Fetch Single Group'),
    ];

    private async _singleGroupHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SingleGroupBody = req.body;

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

            const decoded: string = decodeURIComponent(body.name);
            const group: IGroupModel | null = await GroupController.getGroupByName(decoded);
            if (!group) {
                throw this._error(
                    ERROR_CODE.GROUP_NOT_FOUND,
                    decoded,
                );
            }

            const groupDecorators: string[] = await Throwable_MapDecorators(group.decorators);

            const accounts: IAccount[] = await getAccountsByGroupLean(group._id);
            const namespaceMap: Map<string, INamespaceModel> = await getNamespaceMapByNamespaceIds(accounts.map((each: IAccount) => each.namespace));

            const response: SingleGroupResponse = {

                active: group.active,
                name: group.name,
                members: accounts.map((member: IAccount) => {

                    const namespaceInstance: INamespaceModel | undefined = namespaceMap.get(member.namespace.toHexString());
                    if (!namespaceInstance) {
                        throw this._error(ERROR_CODE.NAMESPACE_NOT_FOUND, member.namespace.toHexString());
                    }

                    return {
                        active: member.active,
                        username: member.username,
                        namespace: namespaceInstance.namespace,
                        displayName: member.displayName,
                        phone: member.phone,
                        email: member.email,
                    };
                }),
                description: group.description,
                decorators: groupDecorators,
            };

            res.agent.migrate(response);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
