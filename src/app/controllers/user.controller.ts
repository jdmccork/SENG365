import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as users from '../models/user.model';

function validateEmail(email: string) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

async function createToken() {
    let token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    let result = await users.getUserByToken(token);
    while (result.length !== 0) {
        token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        result = await users.getUserByToken(token);
    }

    return token;
}

const create = async (req: Request, res: Response):Promise<void> => {
    if (!req.body.hasOwnProperty("firstName")) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide a first name.")
        return
    }

    if (!req.body.hasOwnProperty("lastName")) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide a last name.")
        return
    }

    if (!req.body.hasOwnProperty("email")) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide an email address.")
        return
    }

    if (!req.body.hasOwnProperty("password")) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide a password.")
        return
    }

    const email = req.body.email;

    if (!validateEmail(req.body.email)) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide a valid email address.")
        return
    }

    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;

    try {
        const result = await users.createUser(firstName, lastName, email, password);
        if (result.affectedRows === 0) {
            res.statusMessage = "Bad Request";
            res.status(400).send("Email must not already be in use.");
            return;
        }

        res.statusMessage = "Created";
        res.status(201).send({"userId": result.insertId});
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
};

const login = async (req: Request, res: Response):Promise<void> => {
    Logger.http(`POST login`);

    if (!req.body.hasOwnProperty("email")) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide an email address.");
        return;
    }

    if (!req.body.hasOwnProperty("password")) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Please provide a password.");
        return;
    }

    const email = req.body.email;
    const password = req.body.password;

    try {
        const token = await createToken();
        const result = await users.login(email, password, token);
        if (result.affectedRows !== 1) {
            res.statusMessage = "Bad Request";
            res.status(400).send("User doesn't exist.")
            return;
        }

        const userResult = await users.getUserByToken(token);
        res.statusMessage = "OK";
        res.status(200).send({"userId": userResult[0].id, "token": token});
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const logout = async (req: Request, res: Response):Promise<void> => {
    Logger.http(`POST logout`);
    try {
        const result = await users.logout(parseInt(req.params.authenticatedUserId, 10));

        res.statusMessage = "OK";
        res.status(200).send("Logged out successfully");
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }

}

const retrieve = async (req: Request, res: Response):Promise<void> => {
    Logger.http(`GET user with id: ${req.params.id}`);

    if (isNaN(parseInt(req.params.id, 10))) {
        res.statusMessage = "Bad Request";
        res.status(400).send()
        return;
    }
    const id = Number(req.params.id);
    try {
        const result = await users.getUser(id);

        if (result.length !== 1) {
            res.statusMessage = "Not Found";
            res.status(404).send("User not found")
            return;
        }

        res.statusMessage = "OK";
        const user = result[0];
        if (user.auth_token === req.header("X-Authorization")) {
            res.status(200).send({"firstName":user.first_name, "lastName":user.last_name, "email":user.email})
        return;
        }

        res.status(200).send({"firstName":user.first_name, "lastName":user.last_name})
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const alter = async (req: Request, res: Response):Promise<void> => {
    Logger.http(`POST modify user with id: ${req.params.id}`);

    if (req.header("X-Authorization") === null) {
        res.statusMessage = "Unauthorized";
        res.status(401).send("No authorization token provided");
        return;
    }

    if (!req.body.hasOwnProperty("currentPassword")) {
        res.statusMessage = "Forbidden";
        res.status(403).send("Please provide a password.");
        return;
    }
    if (isNaN(Number(req.params.id))) {
        res.statusMessage = "Bad Request";
        res.status(400).send("Id must be a number")
        return;
    }
    const id = Number(req.params.id);
    const currentPassword = req.body.currentPassword;
    const token = req.header("X-Authorization");
    try {

        const userResult = await users.getUserByToken(token);
        if (userResult.length === 0) {
            res.statusMessage = "Unauthorized";
            res.status(401).send("Invalid session token");
        }

        const user = userResult[0];
        if (user.id !== id) {
            res.statusMessage = "Forbidden";
            res.status(403).send("Cannot alter another user");
        }

        if (currentPassword !== user.password) {
            res.statusMessage = "Forbidden";
            res.status(403).send("Incorrect password");
        }

        const firstName = req.body.hasOwnProperty("firstName") ? req.body.firstName : user.first_name;
        const lastName = req.body.hasOwnProperty("lastName") ? req.body.lastName : user.last_name;
        const password = req.body.hasOwnProperty("password") ? req.body.password : user.password;
        let email = user.email;
        if (req.body.hasOwnProperty("email")) {
            if (!validateEmail(req.body.email)) {
                res.statusMessage = "Bad Request";
                res.status(400).send("Invalid email format");
            }

            email = req.body.email;
        }

        const alterResult = await users.alterUser(id, firstName, lastName, email, password);

        if (alterResult.affectedRows !== 1) {
            res.statusMessage = "Not Found";
            res.status(404).send("User not found")
            return;
        }

        res.statusMessage = "OK";
        res.status(200).send("User data saved successfully");
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {create, login, logout, retrieve, alter}
