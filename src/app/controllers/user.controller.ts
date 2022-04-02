import {Request, Response} from "express";
import { fs } from "mz";
import path from "path";
import Logger from '../../config/logger';
import * as users from '../models/user.model';
import randtoken from 'rand-token';
import bcrypt from 'bcrypt';


function validateEmail(email: string) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validateExists(fields: string[], req:Request):boolean {
    let result = true;
    fields.forEach(field => {
        if (!req.body.hasOwnProperty(field)) {
            result = false;
        }
    });
    return result;
}

const create = async (req: Request, res: Response):Promise<void> => {
    try {
        if (!validateExists(["firstName", "lastName", "email", "password"], req)) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        if (!validateEmail(req.body.email)) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return
        }

        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const email = req.body.email;
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(req.body.password, salt);

        const user = await users.getUserByEmail(email);

        if (user != null) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const result = await users.createUser(firstName, lastName, email, password);

        res.statusMessage = "Created";
        res.status(201).send({"userId": result.insertId});
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
};

const login = async (req: Request, res: Response):Promise<void> => {
    try {
        if (!validateExists(["email", "password"], req)) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const email = req.body.email;
        const user = await users.getUserByEmail(email);

        if (user == null) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const token = randtoken.generate(16);

        await users.login(email, token);

        res.statusMessage = "OK";
        res.status(200).send({"userId": user.id, "token": token});
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const logout = async (req: Request, res: Response):Promise<void> => {
    try {
        await users.logout(Number(req.params.authenticatedUserId));

        res.statusMessage = "OK";
        res.status(200).send("Logged out successfully");
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }

}

const retrieve = async (req: Request, res: Response):Promise<void> => {
    try {
        const id = Number(req.params.id);
        const authId = Number(req.params.authenticatedUserId);
        const user = await users.getUser(id);

        if (user === null) {
            res.statusMessage = "Not Found";
            res.status(404).send()
            return;
        }

        res.statusMessage = "OK";
        if (id === authId) {
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
    try {
        const id = Number(req.params.id);
        const authId = Number(req.params.authenticatedUserId);
        if (authId !== id) {
            res.statusMessage = "Unauthorized";
            res.status(403).send();
            return;
        }

        if (!req.body.hasOwnProperty("currentPassword")) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const userResult = await users.getUser(id);
        const user = userResult;
        const validPassword = await bcrypt.compare(req.body.currentPassword, user.password);

        if (!validPassword) {
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }

        const firstName = req.body.hasOwnProperty("firstName") ? req.body.firstName : user.first_name;
        const lastName = req.body.hasOwnProperty("lastName") ? req.body.lastName : user.last_name;
        const password = req.body.hasOwnProperty("password") ? req.body.password : user.password;
        let email = user.email;

        if (req.body.hasOwnProperty("email")) {
            if (!validateEmail(req.body.email)) {
                res.statusMessage = "Bad Request";
                res.status(400).send();
                return;
            }

            email = req.body.email;
        }

        const alterResult = await users.alterUser(id, firstName, lastName, email, password);

        if (alterResult.affectedRows !== 1) {
            res.statusMessage = "Not Found";
            res.status(404).send()
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

const getImage = async (req:Request, res:Response):Promise<void> => {
    try {
        const id = Number(req.params.id);
        const user = await users.getUser(id);

        if (user == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        if (user.image_filename == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        res.statusMessage = "OK";
        res.status(200).sendFile(path.resolve("./storage/images/" + user.image_filename));
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
        if (id !== authenticatedUserId) {
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }

        const user = await users.getUser(id);

        if (user == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
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
        let location = path.resolve("./storage/images/user_" + fileId + extention);
        if (user.image_filename === null || user.image_filename.length === 0) {
            res.statusMessage = "Created";
            res.status(201);
        } else {
            location = path.resolve("./storage/images/" + user.image_filename);
            fs.unlinkSync(location)
            location = path.resolve("./storage/images/uesr_" + fileId + extention);
            res.statusMessage = "OK";
            res.status(200);
        }
        while (fs.existsSync(location)) {
            fileId += 1;
            location = path.resolve("./storage/images/user_" + fileId + extention);
        }

        fs.writeFile(location, buf);
        users.addImageById("user_" + fileId + extention, id);

        res.send();
    } catch (err){
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const deleteImage = async (req:Request, res:Response):Promise<void> => {
    try {
        const authenticatedUserId = Number(req.params.authenticatedUserId);

        const id = Number(req.params.id);
        if (id !== authenticatedUserId) {
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }

        const user = await users.getUser(id);

        if (user == null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        users.deleteImage(id);

        fs.unlinkSync(path.resolve("./storage/images/" + user.image_filename));

        res.statusMessage = "OK";
        res.status(200).send();
    } catch (err){
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {create, login, logout, retrieve, alter, getImage, setImage, deleteImage}
