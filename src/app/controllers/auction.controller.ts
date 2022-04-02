import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auctions from '../models/auction.model';
import * as categories from '../models/category.model';
import * as auctionBids from '../models/auctionBids.model';
import path from "path";
import { fs } from "mz";

const getAll = async (req: Request, res: Response):Promise<void> => {
    const startIndex = req.query.hasOwnProperty("startIndex") ? Number(req.query.startIndex as string) : 0;
    const count = req.query.hasOwnProperty("count") ? Number(req.query.count as string) : null;
    const searchTerm = req.query.hasOwnProperty("q") ? req.query.q as string : "";

    let categoryIds = req.query.hasOwnProperty("categoryIds") ? req.query.categoryIds as string[] : null;
    if (typeof req.query.categoryIds === 'string') {
        categoryIds = [req.query.categoryIds as string]
    }

    const sellerId = req.query.hasOwnProperty("sellerId") ? Number(req.query.sellerId as string) : null;
    const bidderId = req.query.hasOwnProperty("bidderId") ? Number(req.query.bidderId as string) : null;
    const sortBy = req.query.hasOwnProperty("sortBy") ? req.query.sortBy as string : "CLOSING_SOON";

    if (!Number.isInteger(Number(startIndex))
    || (!Number.isInteger(Number(count)) && count !== null)
    || (isNaN(sellerId) && sellerId !== null)
    || (isNaN(bidderId) && bidderId !== null)
    ) {
        res.statusMessage = "Bad Request";
        res.status(400).send();
        return;
    }

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
            default:
                res.statusMessage = "Bad Request";
                res.status(400).send();
                return;
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
        res.status(400).send()
        return;
    }

    if (!req.body.hasOwnProperty("description")) {
        res.statusMessage = "Bad Request";
        res.status(400).send()
        return
    }

    if (!req.body.hasOwnProperty("endDate")) {
        res.statusMessage = "Bad Request";
        res.status(400).send()
        return
    }

    if (!req.body.hasOwnProperty("categoryId") || !Number.isInteger(Number(req.body.categoryId))) {
        res.statusMessage = "Bad Request";
        res.status(400).send()
        return
    }


    const userId = Number(req.params.authenticatedUserId);

    const title = req.body.title;
    const description = req.body.description;
    const endDate = req.body.endDate;
    const categoryId = Number(req.body.categoryId);
    const reserve = req.body.hasOwnProperty("reserve") ? Number(req.body.reserve) : 1;

    if (!Number.isInteger(reserve)) {
        res.statusMessage = "Bad Request";
        res.status(400).send()
        return
    }

    if (new Date(endDate) < new Date()) {
        res.statusMessage = "Bad Request";
        res.status(400).send();
        return;
    }

    try {
        const categoryResult = await categories.getCategory(categoryId);
        if (categoryResult == null) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const result = await auctions.createAuction(title, description, endDate, "", categoryId, reserve, userId);
        if (result.affectedRows === 0) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
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
    const id = Number(req.params.id);

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
    const id = Number(req.params.id);
    try {
        const originalAuction = await auctions.getAuctionById(id);

        if (originalAuction == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        const authenticatedUserId = Number(req.params.authenticatedUserId);
        const title = req.body.hasOwnProperty("title") ? req.body.title: originalAuction.title;
        const reserve = req.body.hasOwnProperty("reserve")? Number(req.body.reserve): originalAuction.reserve;
        const description = req.body.hasOwnProperty("description")? req.body.description: originalAuction.description;
        const endDate = req.body.hasOwnProperty("endDate")? req.body.endDate: originalAuction.endDate;
        const categoryId = req.body.hasOwnProperty("categoryId")? Number(req.body.categoryId) : originalAuction.categoryId;

        if (!Number.isInteger(reserve) || !Number.isInteger(categoryId)) {
            res.statusMessage = "Bad Request"
            res.status(403).send()
            return;
        }

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
    const id = Number(req.params.id);
    try {
        const originalAuction = await auctions.getAuctionById(id);

        if (originalAuction == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        const authenticatedUserId = Number(req.params.authenticatedUserId);

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
    try {
        const id = Number(req.params.id);
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
        const authenticatedUserId = Number(req.params.authenticatedUserId);

        if (!req.body.hasOwnProperty("amount") || !Number.isInteger(Number(req.body.amount))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return
        }

        const amount = Number(req.body.amount);
        const id = Number(req.params.id);

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
        const id = Number(req.params.id);
        const auction = await auctions.getAuctionById(id);

        if (auction == null || auction.imageFilename.length === 0) {
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
        const authenticatedUserId = Number(req.params.authenticatedUserId);

        const id = Number(req.params.id);
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

        const buf = Buffer.from(req.body.toString('binary'),'binary');
        let fileId = id;
        let location = path.resolve("./storage/images/auction_" + fileId + extention);
        if (auction.imageFilename === null || auction.imageFilename.length === 0) {
            res.statusMessage = "Created";
            res.status(201);
        } else {
            location = path.resolve("./storage/images/" + auction.imageFilename);
            fs.unlinkSync(location)
            location = path.resolve("./storage/images/auction_" + fileId + extention);
            res.statusMessage = "OK";
            res.status(200);
        }
        while (fs.existsSync(location)) {
            fileId += 1;
            location = path.resolve("./storage/images/auction_" + fileId + extention);
        }

        auctions.addImageById("auction_" + fileId + extention, id);
        fs.writeFile(location, buf);

        res.send();
    } catch (err){
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {getAll, create, get, edit, remove, getCategories, getBids, placeBid, getImage, setImage}
