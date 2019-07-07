/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Create
 */

import { ApplicationController, COMMON_KEY_VALIDATE_RESPONSE, COMMON_NAME_VALIDATE_RESPONSE, IApplicationModel, INTERNAL_USER_GROUP, validateCommonKey, validateCommonName } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { BrontosaurusRoute } from "../../routes/basic";
import { ERROR_CODE } from "../../util/error";

export type CreateApplicationRouteBody = {

    name: string;
    key: string;
    expire: number;
    token: string;
};

export class CreateApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/application/create - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/application/create - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/application/create - GroupVerifyHandler'),
        basicHook.wrap(this._applicationCreateHandler.bind(this), '/application/create - Create', true),
    ];

    private async _applicationCreateHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<CreateApplicationRouteBody> = Safe.extract(req.body as CreateApplicationRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const key: string = body.direct('key');

            const validateKeyResult: COMMON_KEY_VALIDATE_RESPONSE = validateCommonKey(key);

            if (validateKeyResult !== COMMON_KEY_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_KEY, validateKeyResult);
            }

            const name: string = body.direct('name');

            const validateNameResult: COMMON_NAME_VALIDATE_RESPONSE = validateCommonName(name);

            if (validateNameResult !== COMMON_NAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_NAME, validateNameResult);
            }

            const isDuplicated: boolean = await ApplicationController.isApplicationDuplicatedByKey(key);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_APPLICATION, key);
            }

            const application: IApplicationModel = ApplicationController.createUnsavedApplication(
                name,
                key,
                body.direct('expire'),
                body.direct('token'),
                {},
            );
            await application.save();

            res.agent.add('application', application.key);
        } catch (err) {

            res.agent.fail(400, err);
        } finally {

            next();
        }
    }
}
