/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Set Organization
 */

import { IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, MatchController, OrganizationController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";

export type SetOrganizationBody = {

    readonly username: string;
    readonly namespace: string;
    readonly organization: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    username: createStringPattern(),
    namespace: createStringPattern(),

    organization: createStringPattern(),
});

export class SetOrganizationRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/set-organization';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._setOrganizationHandler.bind(this), 'Set Organization'),
    ];

    private async _setOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SetOrganizationBody = req.body;

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

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(body.username, body.namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, body.username);
            }

            if (account.organization) {
                const currentOrganization: IOrganizationModel | null = await OrganizationController.getOrganizationById(account.organization);

                if (!currentOrganization) {
                    throw this._error(
                        ERROR_CODE.ORGANIZATION_NOT_FOUND,
                        account.organization.toHexString(),
                    );
                }

                if (currentOrganization.owner.equals(account._id)) {
                    throw this._error(ERROR_CODE.CANNOT_WITHDRAW_OWNER);
                }
            }

            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(body.organization);

            if (!organization) {
                throw this._error(
                    ERROR_CODE.ORGANIZATION_NOT_FOUND,
                    body.organization,
                );
            }

            account.organization = organization._id;
            account.resetMint();

            await account.save();

            res.agent.add('account', account.username);
            res.agent.add('organization', organization.name);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
