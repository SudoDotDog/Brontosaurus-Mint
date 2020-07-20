/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Create
 */

import { AccountController, IAccountModel, INamespaceModel, INTERNAL_USER_GROUP, IOrganizationModel, NamespaceCacheAgent, OrganizationController } from "@brontosaurus/db";
import { _Mutate } from "@sudoo/bark/mutate";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createIntegerPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE, panic } from "../../util/error";

export type OrganizationFetchRouteBody = {

    readonly page: number;
    readonly keyword: string;
};

const bodyPattern: Pattern = createStrictMapPattern({

    page: createIntegerPattern({
        minimum: 0,
    }),
    keyword: createStringPattern(),
});

export type OrganizationFetchElement = {

    readonly active: boolean;
    readonly name: string;
    readonly owner: string;
    readonly ownerNamespace: string;
    readonly ownerActive: boolean;
    readonly ownerDisplayName?: string;
    readonly decorators: number;
    readonly tags: number;
};

export class OrganizationFetchRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._fetchOrganizationHandler.bind(this), 'Fetch Organization'),
    ];

    private async _fetchOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: OrganizationFetchRouteBody = req.body;

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

            const pages: number = await OrganizationController.getSelectedOrganizationPages(
                pageLimit,
                body.keyword,
            );
            const organizations: IOrganizationModel[] = await OrganizationController.getSelectedOrganizationsByPage(
                pageLimit,
                body.page,
                body.keyword,
            );

            const namespaceAgent: NamespaceCacheAgent = NamespaceCacheAgent.create();

            const parsed: OrganizationFetchElement[] = await _Mutate.asyncMap(organizations, async (organization: IOrganizationModel) => {

                const ownerUser: IAccountModel | null = await AccountController.getAccountById(organization.owner);

                if (!ownerUser) {
                    throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, organization.owner.toHexString());
                }

                const ownerNamespace: INamespaceModel | null = await namespaceAgent.getNamespace(ownerUser.namespace);

                if (!ownerNamespace) {
                    throw this._error(ERROR_CODE.NAMESPACE_NOT_FOUND, ownerUser.namespace.toHexString());
                }

                return {

                    active: organization.active,
                    name: organization.name,
                    owner: ownerUser.username,
                    ownerNamespace: ownerNamespace.namespace,
                    ownerActive: ownerUser.active,
                    ownerDisplayName: ownerUser.displayName,
                    decorators: organization.decorators.length,
                    tags: organization.tags.length,
                };
            });

            res.agent.add('organizations', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
