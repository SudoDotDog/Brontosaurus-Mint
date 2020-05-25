/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Util
 * @description Token
 */

import { INFOS_SPLITTER } from "@brontosaurus/db";
import { Basics, IBrontosaurusBody, IBrontosaurusHeader } from "@brontosaurus/definition";
import { _Json } from "@sudoo/bark/json";
import { _Map } from "@sudoo/bark/map";
import { SafeObject } from "@sudoo/extract";

export type SafeToken = {

    readonly header: SafeObject<IBrontosaurusHeader>;
    readonly body: SafeObject<IBrontosaurusBody>;
};

export const jsonifyBasicRecords = (infoLine: string | Record<string, Basics>, error: Error): Record<string, Basics> => {

    if (typeof infoLine === 'string') {
        return _Json.safeParse(infoLine, error);
    }

    return infoLine;
};

export const parseInfo = (infoRecord: Record<string, Basics>): string[] => {

    return _Map.keys(infoRecord).map((key: string) => {

        return `${key}${INFOS_SPLITTER}${infoRecord[key]}`;
    });
};
