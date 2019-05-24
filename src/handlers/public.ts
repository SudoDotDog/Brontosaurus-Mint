/**
 * @author WMXPY
 * @namespace Handler
 * @description Public
 */

import { Request, RequestHandler, Response } from "express";

export const createReplacementHandler = (): RequestHandler =>
    (req: Request, res: Response): void => {

        res.send();
    };
