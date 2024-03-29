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

    app.route(rootUrl + '/auctions/:id/bids')
        .get(validation.pathId, auctions.getBids)
        .post(authenticate.loginRequired, validation.pathId, auctions.placeBid)

    app.route(rootUrl + '/auctions/:id/image')
        .get(validation.pathId, auctions.getImage)
        .put(authenticate.loginRequired, validation.pathId, auctions.setImage)
};
