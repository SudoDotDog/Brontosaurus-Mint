/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes_Application
 * @description Update
 */

import { ApplicationController, IApplicationModel, IGroupModel, INTERNAL_USER_GROUP } from "@brontosaurus/db";
import { ROUTE_MODE, SudooExpressHandler, SudooExpressNextFunction, SudooExpressRequest, SudooExpressResponse } from "@sudoo/express";
import { Safe, SafeExtract } from "@sudoo/extract";
import { HTTP_RESPONSE_CODE } from "@sudoo/magic";
import { ObjectID } from "bson";
import { BrontosaurusRoute } from "../../handlers/basic";
import { createAuthenticateHandler, createGroupVerifyHandler, createTokenHandler } from "../../handlers/handlers";
import { basicHook } from "../../handlers/hook";
import { Throwable_GetGroupsByNames } from "../../util/auth";
import { ERROR_CODE } from "../../util/error";

export type UpdateApplicationBody = {

    readonly key: string;
    readonly application: Partial<{
        avatar: string;
        favicon: string;
        name: string;
        expire: number;
        groups: string[];
        requires: string[];
    }>;
};

export class UpdateApplicationRoute extends BrontosaurusRoute {

    public readonly path: string = '/application/update';
    public readonly mode: ROUTE_MODE = ROUTE_MODE.POST;

    public readonly groups: SudooExpressHandler[] = [
        basicHook.wrap(createTokenHandler(), '/application/update - TokenHandler'),
        basicHook.wrap(createAuthenticateHandler(), '/application/update - AuthenticateHandler'),
        basicHook.wrap(createGroupVerifyHandler([INTERNAL_USER_GROUP.SUPER_ADMIN], this._error), '/application/update - GroupVerifyHandler'),
        basicHook.wrap(this._updateApplicationHandler.bind(this), '/application/update - Update', true),
    ];

    private async _updateApplicationHandler(req: SudooExpressRequest, res: SudooExpressResponse, next: SudooExpressNextFunction): Promise<void> {

        const body: SafeExtract<UpdateApplicationBody> = Safe.extract(req.body as UpdateApplicationBody, this._error(ERROR_CODE.INSUFFICIENT_INFORMATION));

        try {

            if (!req.valid) {
                throw this._error(ERROR_CODE.TOKEN_INVALID);
            }

            const key: string = body.direct('key');
            if (typeof key !== 'string') {
                throw this._error(ERROR_CODE.REQUEST_FORMAT_ERROR, 'key', 'string', (key as any).toString());
            }

            const application: IApplicationModel | null = await ApplicationController.getApplicationByKey(key);
            if (!application) {
                throw this._error(ERROR_CODE.APPLICATION_KEY_NOT_FOUND, key);
            }

            const update: Partial<{
                avatar: string;
                favicon: string;
                name: string;
                expire: number;
                groups: string[];
                requires: string[];
            }> = body.direct('application');

            if (update.groups && Array.isArray(update.groups)) {

                const applicationGroups: IGroupModel[] = await Throwable_GetGroupsByNames(update.groups);
                const idsGroups: ObjectID[] = applicationGroups.map((group: IGroupModel) => group._id);

                application.groups = idsGroups;
            }

            if (update.requires && Array.isArray(update.requires)) {

                const applicationRequires: IGroupModel[] = await Throwable_GetGroupsByNames(update.requires);
                const idsGroups: ObjectID[] = applicationRequires.map((group: IGroupModel) => group._id);

                application.requires = idsGroups;
            }

            if (update.name && typeof update.name === 'string') {
                application.name = update.name;
            }
            if (update.expire && typeof update.expire === 'number') {
                application.expire = Math.ceil(update.expire);
            }
            if (update.avatar && typeof update.avatar === 'string') {
                application.avatar = update.avatar;
            }
            if (update.favicon && typeof update.favicon === 'string') {
                application.favicon = update.favicon;
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
