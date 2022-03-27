import {getPool} from "../../config/db";

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';

import {ResultSetHeader} from "mysql2";
import Logger from "../../config/logger";

const getAuctions = async(searchTerm: string, categoryId: number, sellerId: number, bidderId: number): Promise<Auction[]> => {
    const conn = await getPool().getConnection();
    const query =
    `SELECT
        auction.id AS auctionId, title, category_id AS categoryId, seller_id AS sellerId, user.first_name AS sellerFirstName,
            user.last_name AS sellerLastName, reserve, COUNT(auction_bid.id) AS numBids, MAX(auction_bid.amount) AS highestBid, end_date AS endDate
        FROM auction
        LEFT JOIN auction_bid ON auction.id = auction_bid.auction_id
        LEFT JOIN user ON user.id = auction.seller_id
        WHERE (ISNULL(?) OR INSTR(description, ?) > 0 OR INSTR(title, ?) > 0)
        AND (category_id IN(?) OR ISNULL(?))
        AND (seller_id = ? OR ISNULL(?))
        GROUP BY auction.id
        HAVING NOT SUM(auction_bid.user_id = ? OR ISNULL(?)) = 0`
    const [ result ] = await conn.query( query, [searchTerm, searchTerm, searchTerm,
        categoryId, categoryId,
        sellerId, sellerId,
        bidderId, bidderId ] );
    conn.release();
    return result;
}

const createAuction = async (title:string, description:string, endDate:string, imageFilename:string, categoryId:number, reserve:number, sellerId:number): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    const query = 'INSERT IGNORE INTO auction (category_id, description, end_date, image_filename, reserve, seller_id, title) VALUES ( ?, ?, ?, ?, ?, ?, ? )';
    const [ result ] = await conn.query( query, [ categoryId, description, endDate, imageFilename, reserve, sellerId, title ] );
    conn.release();
    return result;
};

export { getAuctions, createAuction }