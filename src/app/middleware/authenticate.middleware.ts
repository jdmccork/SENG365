import {NextFunction, Request, Response} from "express";
import Logger from '../../config/logger';
import * as users from '../models/user.model';

const loginRequired = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    try {
        if (req.header("X-Authorization") === null) {
            res.statusMessage = "Unauthorized";
            res.status(401).send("No authorization token provided");
            return;
        }
        const token = req.header("X-Authorization");
        const userResult = await users.getUserByToken(token);
        if (userResult.length === 0) {
            res.statusMessage = "Unauthorized";
            res.status(401).send("No user has authorization token");
            return;
        }
        req.params.authenticatedUserId = userResult[0].id.toString();
        next();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const loginOptional = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    try {
        if (req.header("X-Authorization") === null) {
            next();
            return;
        }
        const token = req.header("X-Authorization");
        const userResult = await users.getUserByToken(token);
        if (userResult.length === 0) {
            next();
            return;
        }
        req.params.authenticatedUserId = userResult[0].id.toString();
        next();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {loginRequired, loginOptional}
