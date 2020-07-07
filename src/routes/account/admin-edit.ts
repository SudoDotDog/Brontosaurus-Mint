/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Account
 * @description Self Edit
 */

import { DecoratorController, GroupController, IAccountModel, IDecoratorModel, IGroupModel, INTERNAL_USER_GROUP, ITagModel, MatchController, TagController } from "@brontosaurus/db";
import { Basics } from "@brontosaurus/definition";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createListPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { ERROR_CODE, panic } from "../../util/error";
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

export const bodyPattern: Pattern = createStrictMapPattern({

    username: createStringPattern(),
    namespace: createStringPattern(),
    groups: createListPattern(createStringPattern()),
    tags: createListPattern(createStringPattern()),
    decorators: createListPattern(createStringPattern()),

    avatar: createStringPattern({
        optional: true,
    }),
    displayName: createStringPattern({
        optional: true,
    }),
    email: createStringPattern({
        optional: true,
    }),
    phone: createStringPattern({
        optional: true,
    }),
    account: {
        type: 'any',
        banishNull: true,
        banishUndefined: true,
    },
});

export class AdminEditRoute extends BrontosaurusRoute {

    public readonly path: string = '/account/edit/admin';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._adminEditHandler.bind(this), 'Admin Edit'),
    ];

    private async _adminEditHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: AdminEditBody = req.body;

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const verify: StringedResult = fillStringedResult(req.stringedBodyVerify);

            if (!verify.succeed) {
                throw panic.code(ERROR_CODE.REQUEST_DOES_MATCH_PATTERN, verify.invalids[0]);
            }

            const account: IAccountModel | null = await MatchController.getAccountByUsernameAndNamespaceName(body.username, body.namespace);

            if (!account) {
                throw this._error(ERROR_CODE.ACCOUNT_NOT_FOUND, body.username);
            }

            const update: Partial<{
                infos: Record<string, Basics>;
                beacons: Record<string, Basics>;
            }> = body.account;

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

            const parsedGroups: IGroupModel[] = await GroupController.getGroupByNames(body.groups);
            const parsedTags: ITagModel[] = await TagController.getTagByNames(body.tags);

            const parsedDecorators: IDecoratorModel[] = await DecoratorController.getDecoratorByNames(body.decorators);

            if (body.avatar) {
                account.avatar = body.avatar;
            } else if (account.avatar) {
                account.avatar = undefined;
            }
            if (body.email) {
                account.email = body.email;
            } else if (account.email) {
                account.email = undefined;
            }
            if (body.phone) {
                account.phone = body.phone;
            } else if (account.phone) {
                account.phone = undefined;
            }
            if (body.displayName) {
                account.displayName = body.displayName;
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
