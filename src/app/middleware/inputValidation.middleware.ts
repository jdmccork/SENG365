import {NextFunction, Request, Response} from "express";
import Logger from '../../config/logger';

const pathId = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    try {
        if (req.params.id === null || isNaN(Number(req.params.id)) || !Number.isInteger(Number(req.params.id))) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        next();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {pathId}
