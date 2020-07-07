/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Namespace
 * @description Single
 */

import { INamespaceModel, INTERNAL_USER_GROUP, NamespaceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type SingleNamespaceBody = {

    readonly namespace: string;
};

export class SingleNamespaceRoute extends BrontosaurusRoute {

    public readonly path: string = '/namespace/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(this._singleNamespaceHandler.bind(this), 'Namespace Single'),
    ];

    private async _singleNamespaceHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<SingleNamespaceBody> = Safe.extract(req.body as SingleNamespaceBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const namespace: string = body.direct('namespace');
            if (typeof namespace !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'namespace', 'string', (namespace as any).toString());
            }

            const decoded: string = decodeURIComponent(namespace);
            const namespaceInstance: INamespaceModel | null = await NamespaceController.getNamespaceByNamespace(decoded);
            if (!namespaceInstance) {
                throw this._error(ERROR_CODE.NAMESPACE_NOT_FOUND, namespace);
            }

            res.agent.migrate({
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
