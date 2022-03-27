import {Express} from "express";
import {rootUrl} from "./base.routes"

import * as auctions from '../controllers/auction.controller';
import * as authenticate from '../middleware/authenticate.middleware'

module.exports = (app: Express) => {
    app.route(rootUrl + '/auctions')
        .get(auctions.getAll)
        .post(authenticate.loginRequired, auctions.create);

    app.route(rootUrl + '/auctions/:id')
        .get()
        .patch(authenticate.loginRequired)
        .delete(authenticate.loginRequired);

    app.route(rootUrl + '/auctions/categories')
        .get();
};
