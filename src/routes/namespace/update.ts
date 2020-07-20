/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Namespace
 * @description Update
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

export type UpdateNamespaceBody = {

    readonly namespace: string;
    readonly name: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    namespace: createStringPattern(),
    name: createStringPattern(),
});

export class UpdateNamespaceRoute extends BrontosaurusRoute {

    public readonly path: string = '/namespace/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._updateNamespaceHandler.bind(this), 'Update Namespace'),
    ];

    private async _updateNamespaceHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: UpdateNamespaceBody = req.body;

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

            const namespaceInstance: INamespaceModel | null = await NamespaceController.getNamespaceByNamespace(body.namespace);

            if (!namespaceInstance) {
                throw this._error(ERROR_CODE.NAMESPACE_NOT_FOUND, body.namespace);
            }

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
