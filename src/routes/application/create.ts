/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Create
 */

import { ApplicationController, COMMON_KEY_VALIDATE_RESPONSE, COMMON_NAME_VALIDATE_RESPONSE, IApplicationModel, INTERNAL_USER_GROUP, validateCommonKey, validateCommonName } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createIntegerPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type CreateApplicationRouteBody = {

    readonly name: string;
    readonly key: string;
    readonly expire: number;
};

const bodyPattern: Pattern = createStrictMapPattern({

    name: createStringPattern(),
    key: createStringPattern(),
    expire: createIntegerPattern(),
});

export class CreateApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/create';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._applicationCreateHandler.bind(this), 'Create'),
    ];

    private async _applicationCreateHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: CreateApplicationRouteBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const validateKeyResult: COMMON_KEY_VALIDATE_RESPONSE = validateCommonKey(body.key);

            if (validateKeyResult !== COMMON_KEY_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_KEY, validateKeyResult);
            }

            const validateNameResult: COMMON_NAME_VALIDATE_RESPONSE = validateCommonName(body.name);

            if (validateNameResult !== COMMON_NAME_VALIDATE_RESPONSE.OK) {
                throw this._error(ERROR_CODE.INVALID_COMMON_NAME, validateNameResult);
            }

            const isDuplicated: boolean = await ApplicationController.isApplicationDuplicatedByKey(body.key);

            if (isDuplicated) {
                throw this._error(ERROR_CODE.DUPLICATE_APPLICATION, body.key);
            }

            const application: IApplicationModel = ApplicationController.createUnsavedApplication(
                body.name,
                body.key,
                body.expire,
                {},
            );
            await application.save();

            res.agent.add('application', application.key);
        } catch (err) {


            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {

            next();
        }
    }
}
