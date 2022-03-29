import {Express} from "express";
import {rootUrl} from "./base.routes"

import * as users from '../controllers/user.controller';
import * as authenticate from '../middleware/authenticate.middleware'

module.exports = (app: Express) => {
    app.route(rootUrl + '/users/register')
        .post(users.create);

    app.route(rootUrl + '/users/login')
        .post(users.login);

    app.route(rootUrl + '/users/logout')
        .post(authenticate.loginRequired, users.logout);

    app.route(rootUrl + '/users/:id')
        .get(users.retrieve)
        .patch(authenticate.loginRequired, users.alter);

    app.route(rootUrl + '/users/:id/image')
        .get(users.getImage)
        .put(authenticate.loginRequired, users.setImage)
        .delete(authenticate.loginRequired, users.deleteImage);
};
