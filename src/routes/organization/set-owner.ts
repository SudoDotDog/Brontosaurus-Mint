/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Set Owner
 */

import { IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, MatchController, OrganizationController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { ObjectID } from "bson";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type SetOwnerBody = {

    readonly username: string;
    readonly namespace: string;
    readonly organization: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    username: createStringPattern(),
    namespace: createStringPattern(),
    organization: createStringPattern(),
});

export class SetOwnerRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/set-owner';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._setOwnerHandler.bind(this), 'Set Owner'),
    ];

    private async _setOwnerHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SetOwnerBody = req.body;

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

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(body.organization);

            if (!organization) {
                throw this._error(
                    ERROR_CODE.ORGANIZATION_NOT_FOUND,
                    body.organization,
                );
            }

            const organizationID: ObjectID = organization._id;

            if (!account.organization) {
                throw this._error(
                    ERROR_CODE.ACCOUNT_ORGANIZATION_NOT_FOUND,
                    body.organization,
                );
            }

            if (!organizationID.equals(account.organization)) {
                throw this._error(
                    ERROR_CODE.ALREADY_A_MEMBER,
                    body.organization,
                );
            }

            organization.owner = account._id;

            await organization.save();

            res.agent.add('account', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
