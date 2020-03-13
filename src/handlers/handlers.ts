/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Handlers
 * @description Authenticate
 */

import { AccountController, ApplicationController, IAccountModel, IApplicationModel, INTERNAL_APPLICATION } from "@brontosaurus/db";
import { IBrontosaurusBody } from "@brontosaurus/definition";
import { SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeValue } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { Connor, ErrorCreationFunction } from "connor";
import { compareGroups, getPrincipleFromToken, parseBearerAuthorization, Throwable_GetBody, Throwable_MapGroups, Throwable_ValidateToken } from "../util/auth";
import { ERROR_CODE, MODULE_NAME } from "../util/error";

export const createTokenHandler = (): SudooExpressHandler =>
    async (req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> => {

        const authHeader: string | undefined = req.header('authorization') || req.header('Authorization');
        const auth: string | null = parseBearerAuthorization(authHeader);

        req.info.token = auth;

        next();
    };

export const createAuthenticateHandler = (): SudooExpressHandler =>
    async (req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> => {

        try {

            const token: string = Safe.value(req.info.token).safe();
            const application: IApplicationModel = Safe.value(await ApplicationController.getApplicationByKey(INTERNAL_APPLICATION.RED)).safe();

            Throwable_ValidateToken({
                public: application.publicKey,
                private: application.privateKey,
            }, application.expire, token);

            req.principal = getPrincipleFromToken(token);
            req.authenticate = application;
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    };

export const createGroupVerifyHandler = (groups: string[], error: ErrorCreationFunction): SudooExpressHandler =>
    async (req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> => {

        const token: SafeValue<string> = Safe.value(req.info.token);
        const createError: ErrorCreationFunction = Connor.getErrorCreator(MODULE_NAME);

        try {

            const tokenBody: IBrontosaurusBody = Throwable_GetBody(token.safe());

            // TODO
            // const account: IAccountModel = Safe.value(await AccountController.getAccountByUsername(
            //     Safe.value(tokenBody.username, createError(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_INFORMATION, 'username')).safe()),
            // ).safe();
            // const accountGroups: string[] = await Throwable_MapGroups(account.groups);

            // if (!compareGroups(accountGroups, groups)) {

            //     throw error(ERROR_CODE.NOT_ENOUGH_PERMISSION, groups.toString());
            // }
            req.valid = true;
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    };
