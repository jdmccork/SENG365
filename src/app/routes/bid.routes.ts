import {Express} from "express";
import {rootUrl} from "./base.routes"

import * as auctions from '../controllers/auction.controller';
import * as authenticate from '../middleware/authenticate.middleware'
import * as validation from '../middleware/inputValidation.middleware'

module.exports = (app: Express) => {
    app.route(rootUrl + '/auctions')
        .get(auctions.getAll)
        .post(authenticate.loginRequired, auctions.create);

    app.route(rootUrl + '/auctions/categories')
        .get(auctions.getCategories);

    app.route(rootUrl + '/auctions/:id')
        .get(validation.pathId, auctions.get)
        .patch(authenticate.loginRequired, validation.pathId, auctions.edit)
        .delete(authenticate.loginRequired, validation.pathId, auctions.remove);
};
