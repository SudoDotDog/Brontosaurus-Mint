/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Handlers
 * @description Authenticate
 */

import { AccountController, ApplicationController, IAccountModel, IApplicationModel, INamespaceModel, INTERNAL_APPLICATION, NamespaceController } from "@brontosaurus/db";
import { IBrontosaurusBody } from "@brontosaurus/definition";
import { SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeValue } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { compareGroups, getPrincipleFromToken, parseBearerAuthorization, Throwable_GetBody, Throwable_MapGroups, Throwable_ValidateToken } from "../util/auth";

export const createTokenHandler = (): SudooExpressHandler =>
    (req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): void => {

        const authHeader: string | undefined = req.header('authorization') || req.header('Authorization');
        const auth: string | null = parseBearerAuthorization(authHeader);

        req.infos.token = auth;

        next();
    };

export const createAuthenticateHandler = (): SudooExpressHandler =>
    async (req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> => {

        try {

            const token: string = Safe.value(req.infos.token).safe();
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

export const createGroupVerifyHandler = (groups: string[]): SudooExpressHandler =>
    async (req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> => {

        const token: SafeValue<string> = Safe.value(req.infos.token);

        try {

            const tokenBody: IBrontosaurusBody = Throwable_GetBody(token.safe());

            const namespace: INamespaceModel | null = await NamespaceController.getNamespaceByNamespace(tokenBody.namespace);

            if (!namespace) {
                req.valid = false;
                return;
            }

            const account: IAccountModel | null = await AccountController.getAccountByUsernameAndNamespace(
                tokenBody.username,
                namespace._id,
            );

            if (!account) {
                req.valid = false;
                return;
            }

            const accountGroups: string[] = await Throwable_MapGroups(account.groups);

            if (!compareGroups(accountGroups, groups)) {
                req.valid = false;
                return;
            }

            req.valid = true;
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    };
