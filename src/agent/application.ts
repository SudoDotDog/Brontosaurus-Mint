/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Agent
 * @description Application
 */

import { IApplicationModel } from "@brontosaurus/db";

export class ApplicationAgent {

    public static create() {

        return new ApplicationAgent();
    }

    private readonly _applicationMap: Map<string, IApplicationModel>;

    private constructor() {

        this._applicationMap = new Map();
    }
}
