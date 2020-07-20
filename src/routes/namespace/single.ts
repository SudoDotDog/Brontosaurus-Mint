/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Namespace
 * @description Single
 */

import { INamespaceModel, INTERNAL_USER_GROUP, NamespaceController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type SingleNamespaceBody = {

    readonly namespace: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    namespace: createStringPattern(),
});

export class SingleNamespaceRoute extends BrontosaurusRoute {

    public readonly path: string = '/namespace/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._singleNamespaceHandler.bind(this), 'Namespace Single'),
    ];

    private async _singleNamespaceHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SingleNamespaceBody = req.body;

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

            const decoded: string = decodeURIComponent(body.namespace);
            const namespaceInstance: INamespaceModel | null = await NamespaceController.getNamespaceByNamespace(decoded);
            if (!namespaceInstance) {
                throw this._error(ERROR_CODE.NAMESPACE_NOT_FOUND, decoded);
            }

            res.agent.migrate({

                active: namespaceInstance.active,
                name: namespaceInstance.name,
                namespace: namespaceInstance.namespace,
                domain: namespaceInstance.domain,
            });
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
