/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Namespace
 * @description Update
 */

import { INamespaceModel, INTERNAL_USER_GROUP, NamespaceController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type UpdateNamespaceBody = {

    readonly namespace: string;
    readonly name: string;
};

export class UpdateNamespaceRoute extends BrontosaurusRoute {

    public readonly path: string = '/namespace/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'TokenHandler'),
        autoHook.wrap(createAuthenticateHandler(), 'AuthenticateHandler'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), 'GroupVerifyHandler'),
        autoHook.wrap(this._updateNamespaceHandler.bind(this), 'Update Namespace'),
    ];

    private async _updateNamespaceHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<UpdateNamespaceBody> = Safe.extract(req.body as UpdateNamespaceBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const name: string = body.directEnsure('name');
            const namespace: string = body.directEnsure('namespace');

            const namespaceInstance: INamespaceModel | null = await NamespaceController.getNamespaceByNamespace(namespace);

            if (!namespaceInstance) {
                throw this._error(ERROR_CODE.NAMESPACE_NOT_FOUND, namespace);
            }

            namespaceInstance.name = name;

            await namespaceInstance.save();

            res.agent.add('namespace', namespaceInstance.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
