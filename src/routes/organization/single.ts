/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Single
 */

import { AccountController, IAccountModel, INamespaceModel, INTERNAL_USER_GROUP, IOrganizationModel, NamespaceController, OrganizationController } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { getNamespaceMapByNamespaceIds } from "../../data/namespace";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { Throwable_MapDecorators, Throwable_MapTags } from "../../util/auth";
import { ERROR_CODE, panic } from "../../util/error";

export type SingleOrganizationBody = {

    readonly name: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    name: createStringPattern(),
});

export class SingleOrganizationRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/single';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._singleOrganizationHandler.bind(this), 'Single Organization'),
    ];

    private async _singleOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SingleOrganizationBody = req.body;

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

            const decoded: string = decodeURIComponent(body.name);
            const organization: IOrganizationModel | null = await OrganizationController.getOrganizationByName(decoded);
            if (!organization) {
                throw this._error(ERROR_CODE.ORGANIZATION_NOT_FOUND, body.name);
            }

            const owner: IAccountModel | null = await AccountController.getAccountById(organization.owner);
            if (!owner) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, organization.owner.toHexString());
            }

            const ownerNamespace: INamespaceModel | null = await NamespaceController.getNamespaceById(owner.namespace);
            if (!ownerNamespace) {
                throw this._error(ERROR_CODE.NAMESPACE_NOT_FOUND, owner.namespace.toHexString());
            }

            const members: IAccountModel[] = await AccountController.getAccountsByOrganization(organization._id);

            const decorators: string[] = await Throwable_MapDecorators(organization.decorators);
            const tags: string[] = await Throwable_MapTags(organization.tags);

            const namespaceMap: Map<string, INamespaceModel> = await getNamespaceMapByNamespaceIds(members.map((each: IAccountModel) => each.namespace));

            res.agent.migrate({

                active: organization.active,
                name: organization.name,
                limit: organization.limit,
                owner: {
                    username: owner.username,
                    namespace: ownerNamespace.namespace,
                    active: owner.active,
                    namespaceActive: ownerNamespace.active,
                    displayName: owner.displayName,
                    phone: owner.phone,
                    email: owner.email,
                },
                members: members.map((member) => ({
                    username: member.username,
                    namespace: namespaceMap.get(member.namespace.toHexString())?.namespace,
                    active: member.active,
                    displayName: member.displayName,
                    phone: member.phone,
                    email: member.email,
                })),
                decorators,
                tags,
            });
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
