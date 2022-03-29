import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auctions from '../models/auction.model';
import * as categories from '../models/category.model';
import * as auctionBids from '../models/auctionBids.model';
import path from "path";
import { fs } from "mz";

const getAll = async (req: Request, res: Response):Promise<void> => {
    const startIndex = req.query.hasOwnProperty("startIndex") ? parseInt(req.query.startIndex as string, 10) : 0;
    const count = req.query.hasOwnProperty("count") ? parseInt(req.query.count as string, 10) : null;
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
        let endIndex = result.length;
        if (count != null) {
            endIndex = startIndex + count;
        }
        res.status(200).send({"auctions": result.slice(startIndex, endIndex), "count": result.length});
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
        res.status(400).send()
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
        res.status(400).send();
        return;
    }

    try {
        const categoryResult = await categories.getCategory(categoryId);
        if (categoryResult == null) {
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

    if (isNaN(parseInt(req.params.id, 10))) {
        res.statusMessage = "Bad Request";
        res.status(400).send()
        return;
    }

    const id = parseInt(req.params.id, 10);

    try {
        const result = await auctions.getAuctionById(id);
        if (result == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
        }
        res.statusMessage = "OK";
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const edit = async (req:Request, res:Response):Promise<void> => {
    const id = parseInt(req.params.id, 10);
    try {
        const originalAuction = await auctions.getAuctionById(id);
        Logger.debug(originalAuction);


        if (originalAuction == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        const authenticatedUserId = parseInt(req.params.authenticatedUserId, 10);
        const title = req.body.hasOwnProperty("title") ? req.body.title: originalAuction.title;
        const reserve = req.body.hasOwnProperty("reserve")? parseInt(req.body.reserve, 10): originalAuction.reserve;
        const description = req.body.hasOwnProperty("description")? req.body.description: originalAuction.description;
        const endDate = req.body.hasOwnProperty("endDate")? req.body.endDate: originalAuction.endDate;
        const categoryId = req.body.hasOwnProperty("categoryId")? req.body.categoryId : originalAuction.categoryId;

        if (originalAuction.sellerId !== authenticatedUserId) {
            res.statusMessage = "Forbidden"
            res.status(403).send()
            return;
        } else if (originalAuction.numBids !== 0) {
            res.statusMessage = "Forbidden"
            res.status(403).send()
            return;
        }

        const categoryResult = await categories.getCategory(categoryId);
        if (categoryResult == null) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        const result = await auctions.editAuctionById(id, title, description, reserve, endDate, categoryId);
        res.statusMessage = "OK";
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const remove = async (req:Request, res:Response):Promise<void> => {
    const id = parseInt(req.params.id, 10);
    try {
        const originalAuction = await auctions.getAuctionById(id);

        if (originalAuction == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        const authenticatedUserId = parseInt(req.params.authenticatedUserId, 10);

        if (originalAuction.sellerId !== authenticatedUserId) {
            res.statusMessage = "Forbidden"
            res.status(403).send()
            return;
        } else if (originalAuction.numBids !== 0) {
            res.statusMessage = "Forbidden"
            res.status(403).send()
            return;
        }

        const result = await auctions.deleteAuctionById(id);
        res.statusMessage = "OK";
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const getCategories = async (req:Request, res:Response):Promise<void> => {
    try {
        const result = await categories.getCategories();
        res.statusMessage = "OK";
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const getBids = async (req:Request, res:Response):Promise<void> => {
    Logger.info("Get bids");

    try {
        if (isNaN(parseInt(req.params.id, 10))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
        const id = parseInt(req.params.id, 10);
        const originalAuction = await auctions.getAuctionById(id);

        if (originalAuction == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        const result = await auctionBids.getBids(id);
        result.sort((a, b) => b.amount - a.amount)

        res.statusMessage = "OK";
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const placeBid = async (req:Request, res:Response):Promise<void> => {
    try {
        const authenticatedUserId = parseInt(req.params.authenticatedUserId, 10);

        if (req.body.hasOwnProperty("amount") && isNaN(parseInt(req.body.amount, 10))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return
        }

        if (isNaN(parseInt(req.params.id, 10))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }

        const amount = parseInt(req.body.amount, 10);
        const id = parseInt(req.params.id, 10);
        const originalAuction = await auctions.getAuctionById(id);

        if (originalAuction == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }
        if (originalAuction.sellerId === authenticatedUserId) {
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }
        if (originalAuction.highestBid >= amount) {
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }

        auctionBids.createBid(amount, id, new Date().toISOString(), authenticatedUserId);

        res.statusMessage = "Created";
        res.status(201).send();
    } catch (err){
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const getImage = async (req:Request, res:Response):Promise<void> => {

    try {
        if (isNaN(parseInt(req.params.id, 10))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
        const id = parseInt(req.params.id, 10);
        const auction = await auctions.getAuctionById(id);

        if (auction == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        res.statusMessage = "OK";
        res.status(200).sendFile(path.resolve("./storage/images/" + auction.imageFilename));
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const setImage = async (req:Request, res:Response):Promise<void> => {
    try {
        const authenticatedUserId = parseInt(req.params.authenticatedUserId, 10);

        if (isNaN(parseInt(req.params.id, 10))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }

        const id = parseInt(req.params.id, 10);
        const auction = await auctions.getAuctionById(id);

        if (auction == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        if (auction.sellerId !== authenticatedUserId) {
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }
        let extention = "";
        if (req.is("image/png")) {
            extention = ".png";
        } else if (req.is("image/jpeg")) {
            extention = ".jpg";
        } else if (req.is("image/gif")) {
            extention = ".gif";
        } else {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        Logger.debug(req.body);
        const buf = Buffer.from(req.body.toString('binary'),'binary');
        fs.writeFile(path.resolve("./storage/images/auction_" + id + extention), buf);

        if (auction.imageFilename.length === 0) {
            auctions.addImageById("auction_" + id + extention, id);
            res.statusMessage = "Created";
            res.status(201).send();
            return;
        }
        res.statusMessage = "OK";
        res.status(200).send();
    } catch (err){
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {getAll, create, get, edit, remove, getCategories, getBids, placeBid, getImage, setImage}
