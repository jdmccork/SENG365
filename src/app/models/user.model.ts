import {getPool} from "../../config/db";

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';

import {ResultSetHeader} from "mysql2";

const createUser = async (firstName:string, lastName:string, email:string, password:string): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    try {
    const query = 'INSERT INTO user (first_name, last_name, email, password) VALUES ( ?, ?, ?, ? )';
    const [ result ] = await conn.query( query, [ firstName, lastName, email, password ] );
    conn.release();
    return result;
} catch (err) {
    conn.release();
    throw err;
}
};

const login = async (email:string, token:string): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    try {
    const query = 'UPDATE user SET auth_token = ? WHERE email = ?';
    const [ result ] = await conn.query( query, [ token, email ] );
    conn.release();
    return result;
} catch (err) {
    conn.release();
    throw err;
}
};

const logout = async (userId:number): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    try {
    const query = 'UPDATE user SET auth_token = NULL WHERE id = ?';
    const [ result ] = await conn.query( query, [ userId ] );
    conn.release();
    return result;
} catch (err) {
    conn.release();
    throw err;
}
};

const getUserByToken = async (token:string): Promise<User[]> => {
    const conn = await getPool().getConnection();
    try{
    const query = 'SELECT * FROM user WHERE auth_token = ?';
    const [ result ] = await conn.query( query, [ token ] );
    conn.release();
    return result;
} catch (err) {
    conn.release();
    throw err;
}
}

const getUser = async (id:number): Promise<User> => {
    const conn = await getPool().getConnection();
    try {
    const query = 'SELECT * FROM user WHERE id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    conn.release();
    return result[0];
} catch (err) {
    conn.release();
    throw err;
}
}

const getUserByEmail = async (email:string): Promise<User> => {
    const conn = await getPool().getConnection();
    try {
    const query = 'SELECT * FROM user WHERE email = ?';
    const [ result ] = await conn.query( query, [ email ] );
    conn.release();
    return result[0];
} catch (err) {
    conn.release();
    throw err;
}
}

const alterUser = async (id:number, firstName:string, lastName:string, email:string, password:string): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    try {
    const query = 'UPDATE user SET first_name = ?, last_name = ?, email = ?, password = ? WHERE id = ?';
    const [ result ] = await conn.query( query, [ firstName, lastName, email, password, id ] );
    conn.release();
    return result;
} catch (err) {
    conn.release();
    throw err;
}
}

const addImageById = async (imageFilename:string, userId:number): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    try {
    const query = `UPDATE user SET image_filename = ? WHERE id = ?`;
    const [ result ] = await conn.query( query, [ imageFilename, userId ] );
    conn.release();
    return result;
} catch (err) {
    conn.release();
    throw err;
}
}

const deleteImage = async (userId:number): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    try {
    const query = `UPDATE user SET image_filename = ? WHERE id = ?`;
    const [ result ] = await conn.query( query, [ null, userId ] );
    conn.release();
    return result;
} catch (err) {
    conn.release();
    throw err;
}
}

export {createUser, login, logout, getUserByToken, getUser, getUserByEmail, alterUser, addImageById, deleteImage}