/**
 * @author WMXPY
 * @namespace Handler
 * @description Public
 */

import { readTextFile } from "@sudoo/io";
import { Request, RequestHandler, Response } from "express";
import * as Path from "path";

export const createReplacementHandler = (from: string, to: string): RequestHandler =>
    async (_: Request, res: Response): Promise<void> => {

        const indexFile: string = await readTextFile(Path.join(__dirname, '..', '..', 'public', 'red', 'index.html'));
        res.send(indexFile.replace(from, to));
    };
