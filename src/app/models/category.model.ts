import {getPool} from "../../config/db";

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';

import {ResultSetHeader} from "mysql2";

const getCategory = async (id:number): Promise<Category[]> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT * FROM user WHERE id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    conn.release();
    return result;
}

export {getCategory}