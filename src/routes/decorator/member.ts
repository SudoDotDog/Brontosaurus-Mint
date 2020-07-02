/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Decorator
 * @description Member
 */

import { AccountController, DecoratorController, IAccount, IDecoratorModel, INamespaceModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
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

export type DecoratorFetchMemberBody = {

    readonly decorator: string;
    readonly page: number;
};

export const bodyPattern: Pattern = createStrictMapPattern({

    decorator: createStringPattern(),
    page: createNumberPattern({
        integer: true,
        minimum: 0,
    }),
});

export class DecoratorFetchMemberRoute extends BrontosaurusRoute {

    public readonly path: string = '/decorator/members';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'GroupVerifyHandler'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._decoratorFetchMemberHandler.bind(this), 'Fetch Decorator Member'),
    ];

    private async _decoratorFetchMemberHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: DecoratorFetchMemberBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const decoded: string = decodeURIComponent(body.decorator);
            const decorator: IDecoratorModel | null = await DecoratorController.getDecoratorByName(decoded);
            if (!decorator) {
                throw this._error(ERROR_CODE.DECORATOR_NOT_FOUND, decoded);
            }

            const accounts: IAccount[] = await AccountController.getAccountsByDecoratorAndPageLean(decorator._id, pageLimit, body.page);
            const pages: number = await AccountController.getAccountsByDecoratorPages(decorator._id, pageLimit);

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
