/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Self Edit
 */

import { DecoratorController, GroupController, IAccountModel, IDecoratorModel, IGroupModel, INTERNAL_USER_GROUP, ITagModel, MatchController, TagController } from "@brontosaurus/db";
import { Basics } from "@brontosaurus/definition";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";
import { parseInfo } from "../../util/token";

export type AdminEditBody = {

    readonly username: string;
    readonly namespace: string;
    readonly groups: string[];
    readonly tags: string[];
    readonly decorators: string[];

    readonly avatar?: string;
    readonly displayName?: string;
    readonly email?: string;
    readonly phone?: string;
    readonly account: Partial<{
        readonly infos: Record<string, Basics>;
        readonly beacons: Record<string, Basics>;
    }>;
};

export class AdminEditRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/edit/admin';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/account/edit/admin - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/account/edit/admin - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), '/account/edit/admin - GroupVerifyHandler'),
        basicHook.wrap(this._adminEditHandler.bind(this), '/account/edit/admin - Admin Edit'),
    ];

    private async _adminEditHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<AdminEditBody> = Safe.extract(req.body as AdminEditBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const username: string = body.directEnsure('username');
            const namespace: string = body.directEnsure('namespace');

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(username, namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, username);
            }

            const update: Partial<{
                infos: Record<string, Basics>;
                beacons: Record<string, Basics>;
            }> = body.direct('account');

            if (update.beacons) {
                const newBeacons: Record<string, Basics> = {
                    ...account.getBeaconRecords(),
                    ...update.beacons,
                };
                account.beacons = parseInfo(newBeacons);
            }

            if (update.infos) {
                const newInfos: Record<string, Basics> = {
                    ...account.getInfoRecords(),
                    ...update.infos,
                };
                account.infos = parseInfo(newInfos);
            }

            const groups: string[] = body.direct('groups');
            const tags: string[] = body.direct('tags');
            const parsedGroups: IGroupModel[] = await GroupController.getGroupByNames(groups);
            const parsedTags: ITagModel[] = await TagController.getTagByNames(tags);

            const decorators: string[] = body.direct('decorators');
            const parsedDecorators: IDecoratorModel[] = await DecoratorController.getDecoratorByNames(decorators);

            if (req.body.avatar) {
                account.avatar = req.body.avatar;
            } else if (account.avatar) {
                account.avatar = undefined;
            }
            if (req.body.email) {
                account.email = req.body.email;
            } else if (account.email) {
                account.email = undefined;
            }
            if (req.body.phone) {
                account.phone = req.body.phone;
            } else if (account.phone) {
                account.phone = undefined;
            }
            if (req.body.displayName) {
                account.displayName = req.body.displayName;
            } else if (account.displayName) {
                account.displayName = undefined;
            }
            account.decorators = parsedDecorators.map((decorator: IDecoratorModel) => decorator._id);
            account.groups = parsedGroups.map((group: IGroupModel) => group._id);
            account.tags = parsedTags.map((tag: ITagModel) => tag._id);

            account.resetMint();

            await account.save();

            res.agent.add('account', account.username);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
