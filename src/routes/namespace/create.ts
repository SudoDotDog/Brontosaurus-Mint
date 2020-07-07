/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Namespace
 * @description Create
 */

import { INamespaceModel, INTERNAL_USER_GROUP, NamespaceController, validateNamespace } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";

export type CreateNamespaceBody = {

    readonly name: string;
    readonly namespace: string;
};

export class CreateNamespaceRoute extends BrontosaurusRoute {

    public readonly path: string = '/namespace/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(this._decoratorCreateHandler.bind(this), 'Decorator Create'),
    ];

    private async _decoratorCreateHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<CreateNamespaceBody> = Safe.extract(req.body as CreateNamespaceBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const name: string = body.directEnsure('name');
            const namespace: string = body.directEnsure('namespace');

            const validateResult: boolean = validateNamespace(namespace);

            if (!validateResult) {
                throw this._error(ERROR_CODE.INVALID_NAMESPACE, namespace);
            }

            const isDuplicated: boolean = await NamespaceController.isNamespaceDuplicatedByNamespace(namespace);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_NAMESPACE, namespace);
            }

            const namespaceInstance: INamespaceModel = NamespaceController.createUnsavedNamespaceByNamespace(namespace);

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
