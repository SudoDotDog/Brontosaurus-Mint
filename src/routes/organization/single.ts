/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Single
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { Throwable_MapDecorators, Throwable_MapTags } from "../../util/auth";
import { ERROR_CODE } from "../../util/error";

export type SingleOrganizationBody = {

    readonly name: string;
};

export class SingleOrganizationRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/single - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/single - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/organization/single - GroupVerifyHandler'),
        basicHook.wrap(this._singleOrganizationHandler.bind(this), '/organization/single - Organization Single', true),
    ];

    private async _singleOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<SingleOrganizationBody> = Safe.extract(req.body as SingleOrganizationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const name: string = body.direct('name');
            if (typeof name !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'name', 'string', (name as any).toString());
            }

            const decoded: string = decodeURIComponent(name);
            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(decoded);
            if (!organization) {
                throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, name);
            }

            const owner: IAccountModel | null = await AccountController.getAccountById(organization.owner);
            if (!owner) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, organization.owner.toHexString());
            }

            const members: IAccountModel[] = await AccountController.getAccountsByOrganization(organization._id);

            const decorators: string[] = await Throwable_MapDecorators(organization.decorators);
            const tags: string[] = await Throwable_MapTags(organization.tags);

            res.agent.migrate({
                active: organization.active,
                name: organization.name,
                limit: organization.limit,
                owner: {
                    username: owner.username,
                    displayName: owner.displayName,
                    phone: owner.phone,
                    email: owner.email,
                },
                members: members.map((member) => ({
                    username: member.username,
                    displayName: member.displayName,
                    phone: member.phone,
                    email: member.email,
                })),
                decorators,
                tags,
            });
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
