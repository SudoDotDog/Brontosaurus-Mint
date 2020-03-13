/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Data
 * @description Namespace
 */

import { INamespaceModel, NamespaceController } from "@brontosaurus/db";
import { ObjectID } from "bson";

export const getNamespaceMapByNamespaceIds = async (namespaceIds: ObjectID[]): Promise<Map<string, INamespaceModel>> => {

    const namespaceStringSet: Set<string> = new Set<string>();

    for (const id of namespaceIds) {
        namespaceStringSet.add(id.toHexString());
    }

    const namespaceObjectArray: ObjectID[] = [...namespaceStringSet].map((each) => new ObjectID(each));
    const namespaces: INamespaceModel[] = await NamespaceController.getNamespacesByIds(namespaceObjectArray);

    const map: Map<string, INamespaceModel> = new Map<string, INamespaceModel>();
    for (const namespace of namespaces) {

        map.set(namespace._id.toString(), namespace);
    }

    return map;
};
