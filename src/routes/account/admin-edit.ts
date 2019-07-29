/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Self Edit
 */

import { AccountController, DecoratorController, GroupController, IAccountModel, IDecoratorModel, IGroupModel, INTERNAL_USER_GROUP, ITagModel, TagController } from "@brontosaurus/db";
import { Basics } from "@brontosaurus/definition";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from '@sudoo/extract';
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { ERROR_CODE } from "../../util/error";
import { parseInfo } from "../../util/token";

export type AdminEditBody = {

    readonly username: string;
    readonly groups: string[];
    readonly tags: string[];
    readonly decorators: string[];

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
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/account/edit/admin - GroupVerifyHandler'),
        basicHook.wrap(this._adminEditHandler.bind(this), '/account/edit/admin - Admin Edit', true),
    ];

    private async _adminEditHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<AdminEditBody> = Safe.extract(req.body as AdminEditBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            const username: string = body.directEnsure('username');

            const account: IAccountModel | null = await AccountController.getAccountByUsername(username);

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

            if (req.body.email) {
                account.email = req.body.email;
            }
            if (req.body.phone) {
                account.phone = req.body.phone;
            }
            if (req.body.displayName) {
                account.displayName = req.body.displayName;
            }
            account.decorators = parsedDecorators.map((decorator: IDecoratorModel) => decorator._id);
            account.groups = parsedGroups.map((group: IGroupModel) => group._id);
            account.tags = parsedTags.map((tag: ITagModel) => tag._id);

            account.resetMint();

            await account.save();

            res.agent.add('account', account.username);
        } catch (err) {
            res.agent.fail(400, err);
        } finally {
            next();
        }
    }
}
