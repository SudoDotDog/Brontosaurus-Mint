/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Verify Previous Password
 */

import { IAccountModel, INTERNAL_USER_GROUP, MatchController, PreviousPassword } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type VerifyPreviousPasswordBody = {

    readonly username: string;
    readonly namespace: string;
    readonly password: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    username: createStringPattern(),
    namespace: createStringPattern(),

    password: createStringPattern(),
});

export class VerifyPreviousPasswordRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/verify-previous-password';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._verifyPreviousPasswordHandler.bind(this), 'Verify Previous Password'),
    ];

    private async _verifyPreviousPasswordHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: VerifyPreviousPasswordBody = req.body;

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

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(
                body.username,
                body.namespace,
            );

            if (!account) {
                throw this._error(
                    ERROR_CODE.ACCOUNT_NOT_FOUND,
                    body.username,
                );
            }

            const previousPassword: PreviousPassword | null = account.verifyPreviousPassword(body.password);

            if (previousPassword) {
                res.agent.add('previousPassword', previousPassword);
            } else {
                res.agent.add('previousPassword', null);
            }

            res.agent.add('account', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
