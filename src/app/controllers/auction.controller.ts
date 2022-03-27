import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auctions from '../models/auction.model';
import * as categories from '../models/category.model';

const getAll = async (req: Request, res: Response):Promise<void> => {
    Logger.http("Get all auctions");

    const startIndex = req.query.hasOwnProperty("startIndex") ? req.query.startIndex as string : 0;
    const count = req.query.hasOwnProperty("count") ? req.query.count as string : null;
    const searchTerm = req.query.hasOwnProperty("q") ? req.query.q as string : "";

    let categoryIds = req.query.hasOwnProperty("categoryIds") ? req.query.categoryIds as string[] : null;
    if (typeof req.query.categoryIds === 'string') {
        categoryIds = [req.query.categoryIds as string]
    }


    const sellerId = req.query.hasOwnProperty("sellerId") ? parseInt(req.query.sellerId as string, 10) : null;
    const bidderId = req.query.hasOwnProperty("bidderId") ? parseInt(req.query.bidderId as string, 10) : null;
    const sortBy = req.query.hasOwnProperty("sortBy") ? req.query.sortBy as string : "CLOSING_SOON";

    try {
        let result:Auction[] = [];
        if (categoryIds == null) {
            result = await auctions.getAuctions(searchTerm, null, sellerId, bidderId);
        } else {
            for (const categoryId of categoryIds) {
                result = result.concat(await auctions.getAuctions(searchTerm, parseInt(categoryId, 10), sellerId, bidderId))
            }
        }

        switch (sortBy) {
            case SortFilters.ALPHABETICAL_ASC:
                result.sort((a, b) => {
                    if (a.title > b.title) {
                        return 1;
                    }
                    if (a.title < b.title) {
                        return -1;
                    }

                    return 0;
                })
                break;
            case SortFilters.ALPHABETICAL_DESC:
                result.sort((a, b) => {
                    if (a.title < b.title) {
                        return 1;
                    }
                    if (a.title > b.title) {
                        return -1;
                    }

                    return 0;
                })
                break;
            case SortFilters.BIDS_ASC:
                result.sort((a, b) => a.numBids - b.numBids)
                break;
            case SortFilters.BIDS_DESC:
                result.sort((a, b) => b.numBids - a.numBids)
                break;
            case SortFilters.CLOSING_SOON:
                result.sort((a, b) => {
                    if (a.endDate > b.endDate) {
                        return 1;
                    }
                    if (a.endDate < b.endDate) {
                        return -1;
                    }

                    return 0;
                })
                break;
            case SortFilters.CLOSING_LAST:
                result.sort((a, b) => {
                    if (a.endDate < b.endDate) {
                        return 1;
                    }
                    if (a.endDate > b.endDate) {
                        return -1;
                    }

                    return 0;
                })
                break;
            case SortFilters.RESERVE_ASC:
                result.sort((a, b) => a.reserve - b.reserve)
                break;
            case SortFilters.RESERVE_DESC:
                result.sort((a, b) => b.reserve - a.reserve)
                break;
        }

        res.status(200).send({"auctions": result, "count": result.length});
    }  catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const create = async (req: Request, res: Response):Promise<void> => {
    if (!req.body.hasOwnProperty("title")) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide a first name.")
        return;
    }

    if (!req.body.hasOwnProperty("description")) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide a last name.")
        return
    }

    if (!req.body.hasOwnProperty("endDate")) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide an email address.")
        return
    }

    if (!req.body.hasOwnProperty("categoryId")) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide a password.")
        return
    }

    if (req.body.hasOwnProperty("reserve") && isNaN(Number(req.body.reserve))) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Reserve must be a number.")
        return
    }

    const userId = req.params.authenticatedUserId;

    const title = req.body.title;
    const description = req.body.description;
    const endDate = req.body.endDate;
    const categoryId = req.body.categoryId;
    const reserve = req.body.hasOwnProperty("reserve") ? Number(req.body.reserve) : 1;

    if (new Date(endDate) < new Date()) {
        res.statusMessage = "Bad Request";
        res.status(400).send("End date must be after start date.");
    }

    try {
        const categoryResult = categories.getCategory(categoryId);
        if (categoryId.length === 0) {
            res.statusMessage = "Bad Request";
            res.status(400).send("Category doesn't exist.");
            return;
        }

        const result = await auctions.createAuction(title, description, endDate, "", categoryId, reserve, parseInt(userId, 10));
        if (result.affectedRows === 0) {
            res.statusMessage = "Bad Request";
            res.status(400).send("Email must not already be in use.");
            return;
        }

        res.statusMessage = "Created";
        res.status(201).send({"auctionId": result.insertId});
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
};

const get = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`GET user with id: ${req.params.id}`);

    if (isNaN(parseInt(req.params.id, 10))) {
        res.statusMessage = "Bad Request";
        res.status(400).send()
        return;
    }

    const id = parseInt(req.params.id, 10);

    try {
        const result = await auctions.getAuctionById(id);
        res.statusMessage = "OK";
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {getAll, create, get}
