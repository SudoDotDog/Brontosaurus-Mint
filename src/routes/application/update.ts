/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Update
 */

import { ApplicationController, ApplicationRedirection, IApplicationModel, IGroupModel, INTERNAL_USER_GROUP, ITagModel } from "@brontosaurus/db";
import { createStringedBodyVerifyHandler, ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { createBooleanPattern, createListPattern, createStrictMapPattern, createStringPattern, Pattern } from "@sudoo/pattern";
import { fillStringedResult, StringedResult } from "@sudoo/verify";
import { ObjectID } from "bson";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { autoHook } from "../../handlers/hook";
import { Throwable_GetGroupsByNames, Throwable_GetTagsByNames } from "../../util/auth";
import { ERROR_CODE, panic } from "../../util/error";
import { createRedirectionPattern } from "../../util/pattern";

export type ApplicationUpdatePattern = {

    readonly avatar?: string;
    readonly favicon?: string;
    readonly name?: string;
    readonly expire?: number;

    readonly redirections?: ApplicationRedirection[];
    readonly iFrameProtocol?: boolean;
    readonly postProtocol?: boolean;
    readonly alertProtocol?: boolean;
    readonly noneProtocol?: boolean;

    readonly groups?: string[];
    readonly requires?: string[];
    readonly requireTags?: string[];
};

export type UpdateApplicationBody = {

    readonly key: string;
    readonly application: ApplicationUpdatePattern;
};

const bodyPattern: Pattern = createStrictMapPattern({

    key: createStringPattern(),
    application: createStrictMapPattern({
        avatar: createStringPattern({
            optional: true,
        }),
        favicon: createStringPattern({
            optional: true,
        }),
        name: createStringPattern({
            optional: true,
        }),
        expire: createStringPattern({
            optional: true,
        }),

        redirections: createListPattern(
            createRedirectionPattern(),
            {
                optional: true,
            },
        ),
        iFrameProtocol: createBooleanPattern({
            optional: true,
        }),
        postProtocol: createBooleanPattern({
            optional: true,
        }),
        alertProtocol: createBooleanPattern({
            optional: true,
        }),
        noneProtocol: createBooleanPattern({
            optional: true,
        }),

        groups: createListPattern(
            createStringPattern(),
            {
                optional: true,
            },
        ),
        requires: createListPattern(
            createStringPattern(),
            {
                optional: true,
            },
        ),
        requireTags: createListPattern(
            createStringPattern(),
            {
                optional: true,
            },
        ),
    }),
});

export class UpdateApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        autoHook.wrap(createTokenHandler(), 'Token'),
        autoHook.wrap(createAuthenticateHandler(), 'Authenticate'),
        autoHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN]), 'Group Verify'),
        autoHook.wrap(createStringedBodyVerifyHandler(bodyPattern), 'Body Verify'),
        autoHook.wrap(this._updateApplicationHandler.bind(this), 'Update Application'),
    ];

    private async _updateApplicationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: UpdateApplicationBody = req.body;

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

            const application: IApplicationModel | null = await ApplicationController.getApplicationByKey(body.key);
            if (!application) {
                throw this._error(ERROR_CODE.APPLICATION_KEY_NOT_FOUND, body.key);
            }

            const update: ApplicationUpdatePattern = body.application;

            if (update.redirections) {

                application.redirections = update.redirections.map((each: ApplicationRedirection): ApplicationRedirection => ({
                    name: each.name,
                    regexp: each.regexp,
                }));
            }

            if (update.groups) {

                const applicationGroups: IGroupModel[] = await Throwable_GetGroupsByNames(update.groups);
                const idsGroups: ObjectID[] = applicationGroups.map((group: IGroupModel) => group._id);

                application.groups = idsGroups;
            }

            if (update.requires) {

                const applicationRequires: IGroupModel[] = await Throwable_GetGroupsByNames(update.requires);
                const idsGroups: ObjectID[] = applicationRequires.map((group: IGroupModel) => group._id);

                application.requires = idsGroups;
            }

            if (update.requireTags) {

                const applicationRequireTags: ITagModel[] = await Throwable_GetTagsByNames(update.requireTags);
                const requireTagsGroups: ObjectID[] = applicationRequireTags.map((tag: ITagModel) => tag._id);

                application.requireTags = requireTagsGroups;
            }

            if (update.name) {
                application.name = update.name;
            }
            if (update.expire) {
                application.expire = Math.ceil(update.expire);
            }
            if (update.avatar) {
                application.avatar = update.avatar;
            }
            if (update.favicon) {
                application.favicon = update.favicon;
            }

            if (typeof update.iFrameProtocol === 'boolean') {
                application.iFrameProtocol = update.iFrameProtocol;
            }
            if (typeof update.postProtocol === 'boolean') {
                application.postProtocol = update.postProtocol;
            }
            if (typeof update.alertProtocol === 'boolean') {
                application.alertProtocol = update.alertProtocol;
            }
            if (typeof update.noneProtocol === 'boolean') {
                application.noneProtocol = update.noneProtocol;
            }

            await application.save();

            res.agent.add('application', application.key);
        } catch (err) {

            res.agent.fail(HTTP_RESPONSE_CODE.BAD_REQUEST, err);
        } finally {
            next();
        }
    }
}
