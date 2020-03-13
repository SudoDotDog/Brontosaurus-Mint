/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Data
 * @description Namespace
 */

import { INamespaceModel, NamespaceController } from "@brontosaurus/db";
import { ObjectID } from "bson";

export const getNamespaceMapByNamespaceIds = async (namespaceIds: ObjectID[]): Promise<Map<string, INamespaceModel>> => {

    const namespaces: INamespaceModel[] = await NamespaceController.getNamespacesByIds(namespaceIds);

    const map: Map<string, INamespaceModel> = new Map<string, INamespaceModel>();
    for (const namespace of namespaces) {

        map.set(namespace._id.toString(), namespace);
    }

    return map;
};
