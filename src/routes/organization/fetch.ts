/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Organization
 * @description Create
 */

import { AccountController, IAccountModel, INTERNAL_USER_GROUP, IOrganizationModel, OrganizationController } from "@brontosaurus/db";
import { _Mutate } from "@sudoo/bark/mutate";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { pageLimit } from "../../util/conf";
import { ERROR_CODE } from "../../util/error";

export type OrganizationFetchRouteBody = {

    page: number;
    keyword: string;
};

export class OrganizationFetchRoute extends BrontosaurusRoute {

    public readonly path: string = '/organization/fetch';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/organization/fetch - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/organization/fetch - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/organization/fetch - GroupVerifyHandler'),
        basicHook.wrap(this._fetchOrganizationHandler.bind(this), '/organization/fetch - Fetch', true),
    ];

    private async _fetchOrganizationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<OrganizationFetchRouteBody> = Safe.extract(req.body as OrganizationFetchRouteBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const page: number = body.direct('page');
            if (typeof page !== 'number' || page < 0) {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'page', 'number', (page as any).toString());
            }

            const keyword: string = body.direct('keyword');
            if (typeof keyword !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'keyword', 'string', (keyword as any).toString());
            }

            const pages: number = await OrganizationController.getSelectedActiveOrganizationPages(pageLimit, keyword);
            const organizations: IOrganizationModel[] = await OrganizationController.getSelectedActiveOrganizationsByPage(pageLimit, Math.floor(page), keyword);

            const parsed: Array<{
                name: string;
                owner: string;
                decorators: number;
                tags: number;
            }> = await _Mutate.asyncMap(organizations, async (organization: IOrganizationModel) => {

                const ownerUser: IAccountModel | null = await AccountController.getAccountById(organization.owner);

                if (!ownerUser) {
                    throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, organization.owner.toHexString());
                }

                return {
                    name: organization.name,
                    owner: ownerUser.username,
                    decorators: organization.decorators.length,
                    tags: organization.tags.length,
                };
            });

            res.agent.add('organizations', parsed);
            res.agent.add('pages', Math.ceil(pages));
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
