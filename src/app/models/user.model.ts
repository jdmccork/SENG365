import {getPool} from "../../config/db";

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';

import {ResultSetHeader} from "mysql2";

const createUser = async (firstName:string, lastName:string, email:string, password:string): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    const query = 'INSERT IGNORE INTO user (first_name, last_name, email, password) VALUES ( ?, ?, ?, ? )';
    const [ result ] = await conn.query( query, [ firstName, lastName, email, password ] );
    conn.release();
    return result;
};

const login = async (email:string, password:string, token:string): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    const query = 'UPDATE user SET auth_token = ? WHERE email = ? AND password = ?';
    const [ result ] = await conn.query( query, [ token, email, password ] );
    conn.release();
    return result;
};

const logout = async (userId:number): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    const query = 'UPDATE user SET auth_token = NULL WHERE id = ?';
    const [ result ] = await conn.query( query, [ userId ] );
    conn.release();
    return result;
};

const getUserByToken = async (token:string): Promise<User[]> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT * FROM user WHERE auth_token = ?';
    const [ result ] = await conn.query( query, [ token ] );
    conn.release();
    return result;
}

const getUser = async (id:number): Promise<User[]> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT * FROM user WHERE id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    conn.release();
    return result;
}

const alterUser = async (id:number, firstName:string, lastName:string, email:string, password:string): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    const query = 'UPDATE user SET first_name = ?, last_name = ?, email = ?, password = ? WHERE id = ?';
    const [ result ] = await conn.query( query, [ firstName, lastName, email, password, id ] );
    conn.release();
    return result;
}

export {createUser, login, logout, getUserByToken, getUser, alterUser}