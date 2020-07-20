/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Namespace
 * @description Create
 */

import { INamespaceModel, INTERNAL_USER_GROUP, NamespaceController, validateNamespace } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type CreateNamespaceBody = {

    readonly name: string;
    readonly namespace: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    name: createStringPattern(),
    namespace: createStringPattern(),
});

export class CreateNamespaceRoute extends BrontosaurusRoute {

    public readonly path: string = '/namespace/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._decoratorCreateHandler.bind(this), 'Decorator Create'),
    ];

    private async _decoratorCreateHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: CreateNamespaceBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const validateResult: boolean = validateNamespace(body.namespace);

            if (!validateResult) {
                throw this._error(
                    ERROR_CODE.INVALID_NAMESPACE,
                    body.namespace,
                );
            }

            const isDuplicated: boolean = await NamespaceController.isNamespaceDuplicatedByNamespace(body.namespace);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_NAMESPACE, body.namespace);
            }

            const namespaceInstance: INamespaceModel = NamespaceController.createUnsavedNamespaceByNamespace(body.namespace);

            namespaceInstance.name = body.name;
            await namespaceInstance.save();

            res.agent.add('namespace', namespaceInstance.name);
        } catch (err) {


            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {

            next();
        }
    }
}
