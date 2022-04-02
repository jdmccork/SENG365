import {Express} from "express";
import {rootUrl} from "./base.routes"

import * as users from '../controllers/user.controller';
import * as authenticate from '../middleware/authenticate.middleware'
import * as validation from '../middleware/inputValidation.middleware'

module.exports = (app: Express) => {
    app.route(rootUrl + '/users/register')
        .post(users.create);

    app.route(rootUrl + '/users/login')
        .post(users.login);

    app.route(rootUrl + '/users/logout')
        .post(authenticate.loginRequired, users.logout);

    app.route(rootUrl + '/users/:id')
        .get(authenticate.loginOptional, validation.pathId, users.retrieve)
        .patch(authenticate.loginRequired, validation.pathId, users.alter);

    app.route(rootUrl + '/users/:id/image')
        .get(validation.pathId, users.getImage)
        .put(authenticate.loginRequired, validation.pathId, users.setImage)
        .delete(authenticate.loginRequired, validation.pathId, users.deleteImage);
};
