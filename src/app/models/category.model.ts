import {getPool} from "../../config/db";

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';


const getCategory = async (id:number): Promise<Category> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT id, name FROM category WHERE id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    conn.release();
    return result;
}

const getCategories = async (): Promise<Category[]> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT id AS categoryId, name FROM category';
    const [ result ] = await conn.query( query );
    conn.release();
    return result;
}

export {getCategory, getCategories}