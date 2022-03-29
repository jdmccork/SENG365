import {getPool} from "../../config/db";

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';

import {ResultSetHeader} from "mysql2";
import Logger from "../../config/logger";

const getBids = async(auctionId: number): Promise<AuctionBid[]> => {
    const conn = await getPool().getConnection();
    const query =
    `SELECT
        user_id AS bidderId, amount, user.first_name AS firstName, user.last_name AS lastName, timestamp
        FROM auction_bid
        LEFT JOIN auction ON auction_id = auction.id
        LEFT JOIN user ON user.id = auction.seller_id
        WHERE auction_id = ?`
    const [ result ] = await conn.query( query, [ auctionId ] );
    conn.release();
    return result;
}

const createBid = async (amount:number, auctionId:number, timestamp:string, userId:number): Promise<ResultSetHeader> => {
    Logger.debug(timestamp);
    const conn = await getPool().getConnection();
    const query = 'INSERT IGNORE INTO auction_bid (amount, auction_id, timestamp, user_id) VALUES ( ?, ?, ?, ? )';
    const [ result ] = await conn.query( query, [ amount, auctionId, timestamp, userId ] );
    conn.release();
    return result;
};

export { getBids, createBid }