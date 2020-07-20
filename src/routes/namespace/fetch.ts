/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Namespace
 * @description Fetch
 */

import { INamespaceModel, INTERNAL_USER_GROUP, NamespaceController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createIntegerPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE, panic } from "../../util/error";

export type FetchNamespaceBody = {

    readonly page: number;
    readonly keyword: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    page: createIntegerPattern({
        minimum: 0,
    }),
    keyword: createStringPattern(),
});

export type FetchNamespaceElement = {

    readonly active: boolean;
    readonly namespace: string;
    readonly domain: string;
    readonly name?: string;
};

export class FetchNamespaceRoute extends BrontosaurusRoute {

    public readonly path: string = '/namespace/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._fetchNamespaceHandler.bind(this), 'Namespace Fetch'),
    ];

    private async _fetchNamespaceHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: FetchNamespaceBody = req.body;

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

            const pages: number = await NamespaceController.getSelectedNamespacePages(
                pageLimit,
                body.keyword,
            );
            const namespaces: INamespaceModel[] = await NamespaceController.getSelectedNamespacesByPage(
                pageLimit,
                body.page,
                body.keyword,
            );

            const parsed: FetchNamespaceElement[] = namespaces.map((namespace: INamespaceModel) => ({

                active: namespace.active,
                name: namespace.name,
                namespace: namespace.namespace,
                domain: namespace.domain,
            }));

            res.agent.add('namespaces', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
