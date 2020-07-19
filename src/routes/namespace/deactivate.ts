/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Namespace
 * @description Deactivate
 */

import { NamespaceController, INamespaceModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type NamespaceDeactivateRouteBody = {

    readonly namespace: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    namespace: createStringPattern(),
});

export class NamespaceDeactivateRoute extends BrontosaurusRoute {

    public readonly path: string = '/namespace/deactivate';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._deactivateNamespaceHandler.bind(this), 'Deactivate Namespace'),
    ];

    private async _deactivateNamespaceHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: NamespaceDeactivateRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const namespace: INamespaceModel | null = await NamespaceController.getNamespaceByNamespace(body.namespace);

            if (!namespace) {
                throw panic.code(ERROR_CODE.NAMESPACE_NOT_FOUND, body.namespace);
            }

            if (!namespace.active) {
                throw this._error(ERROR_CODE.ALREADY_DEACTIVATED, body.namespace);
            }

            namespace.active = false;
            await namespace.save();

            res.agent.add('deactivated', namespace.namespace);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
