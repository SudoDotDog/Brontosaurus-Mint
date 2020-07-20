/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Util
 * @description Auth
 */

import { Brontosaurus, BrontosaurusKey, BrontosaurusToken } from "@brontosaurus/core";
import { DecoratorController, GroupController, IDecoratorModel, IGroupModel, ITagModel, TagController } from "@brontosaurus/db";
import { IBrontosaurusBody, IBrontosaurusHeader } from "@brontosaurus/definition";
import { Safe } from "@sudoo/extract";
import { randomString } from "@sudoo/random";
import { ObjectID } from "bson";
import { Connor, ErrorCreationFunction } from "connor";
import { createHash, Hash } from 'crypto';
import { isArray } from "util";
import { ERROR_CODE, MODULE_NAME } from "./error";
import { SafeToken } from "./token";

export const Throwable_ValidateToken = (secret: BrontosaurusKey, expire: number, tokenString: string): IBrontosaurusBody => {

    const token: BrontosaurusToken = Brontosaurus.token(secret);
    const createError: ErrorCreationFunction = Connor.getErrorCreator(MODULE_NAME);

    if (!token.clock(tokenString, expire, 1000)) { // Allow delay for 1 second
        throw createError(ERROR_CODE.TOKEN_EXPIRED);
    }

    if (!token.check(tokenString)) {
        throw createError(ERROR_CODE.TOKEN_INVALID);
    }

    const body: IBrontosaurusBody | null = token.body(tokenString);

    if (!body) {
        throw createError(ERROR_CODE.TOKEN_INVALID);
    }

    return body;
};

export const getPrincipleFromToken = (tokenString: string): SafeToken => {

    const createError: ErrorCreationFunction = Connor.getErrorCreator(MODULE_NAME);

    const header: IBrontosaurusHeader | null = Brontosaurus.decoupleHeader(tokenString);

    if (!header) {
        throw createError(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_HEADER);
    }

    const body: IBrontosaurusBody | null = Brontosaurus.decoupleBody(tokenString);

    if (!body) {
        throw createError(ERROR_CODE.TOKEN_DOES_NOT_CONTAIN_BODY);
    }

    return {
        header: Safe.object(header),
        body: Safe.object(body),
    };
};

export const parseBearerAuthorization = (auth: string | undefined): string | null => {

    if (!auth || auth.length <= 7) {
        return null;
    }

    const splited: string[] = auth.split(' ');
    if (splited.length !== 2) {
        return null;
    }

    const type: string = splited[0];

    if (type.toLowerCase() !== 'bearer') {
        return null;
    }

    const value: string = splited[1];
    return value;
};

export const Throwable_GetBody = (token: string): IBrontosaurusBody => {

    const body: IBrontosaurusBody | null = Brontosaurus.decoupleBody(token);

    const createError: ErrorCreationFunction = Connor.getErrorCreator(MODULE_NAME);

    if (!body) {
        throw createError(ERROR_CODE.TOKEN_INVALID);
    }

    return body;
};

export const Throwable_MapGroups = async (groups: ObjectID[]): Promise<string[]> => {

    const createError: ErrorCreationFunction = Connor.getErrorCreator(MODULE_NAME);

    const result: string[] = [];

    for (const group of groups) {

        const current: IGroupModel | null = await GroupController.getGroupById(group);

        if (!current) {
            throw createError(ERROR_CODE.GROUP_NOT_FOUND, group.toHexString());
        }

        result.push(current.name);
    }

    return result;
};

export const Throwable_MapTags = async (tags: ObjectID[]): Promise<string[]> => {

    const createError: ErrorCreationFunction = Connor.getErrorCreator(MODULE_NAME);

    const result: string[] = [];

    for (const tag of tags) {

        const current: ITagModel | null = await TagController.getTagById(tag);

        if (!current) {
            throw createError(ERROR_CODE.DECORATOR_NOT_FOUND, tag.toHexString());
        }

        result.push(current.name);
    }

    return result;
};

export const Throwable_MapDecorators = async (decorators: ObjectID[]): Promise<string[]> => {

    const createError: ErrorCreationFunction = Connor.getErrorCreator(MODULE_NAME);

    const result: string[] = [];

    for (const decorator of decorators) {

        const current: IDecoratorModel | null = await DecoratorController.getDecoratorById(decorator);

        if (!current) {
            throw createError(ERROR_CODE.DECORATOR_NOT_FOUND, decorator.toHexString());
        }

        result.push(current.name);
    }

    return result;
};

export const Throwable_GetGroupsByNames = async (groups: string[]): Promise<IGroupModel[]> => {

    const createError: ErrorCreationFunction = Connor.getErrorCreator(MODULE_NAME);

    const result: IGroupModel[] = [];

    for (const group of groups) {

        const current: IGroupModel | null = await GroupController.getGroupByName(group);

        if (!current) {
            throw createError(ERROR_CODE.GROUP_NOT_FOUND, group);
        }

        result.push(current);
    }

    return result;
};

export const Throwable_GetTagsByNames = async (tags: string[]): Promise<ITagModel[]> => {

    const createError: ErrorCreationFunction = Connor.getErrorCreator(MODULE_NAME);

    const result: ITagModel[] = [];

    for (const tag of tags) {

        const current: ITagModel | null = await TagController.getTagByName(tag);

        if (!current) {
            throw createError(ERROR_CODE.TAG_NOT_FOUND, tag);
        }

        result.push(current);
    }

    return result;
};

export const compareGroups = (userGroups: string[], targetGroups: any): boolean => {

    if (!isArray(targetGroups)) {

        return false;
    }

    for (const need of targetGroups) {

        if (!userGroups.includes(need)) {
            return false;
        }
    }

    return true;
};

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export const createSalt = (): string => Math.random().toString(36).substring(2, 9);
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export const createMint = (): string => Math.random().toString(36).substring(2, 9);

export const garblePassword = (password: string, salt: string): string => {

    const salted: string = password + ':' + salt;
    const md5: Hash = createHash('md5').update(salted);

    return md5.digest('hex');
};

export const createRandomTempPassword = (): string => {

    return randomString();
};
