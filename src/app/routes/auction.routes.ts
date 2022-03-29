import {Express} from "express";
import {rootUrl} from "./base.routes"

import * as auctions from '../controllers/auction.controller';
import * as authenticate from '../middleware/authenticate.middleware'

module.exports = (app: Express) => {
    app.route(rootUrl + '/auctions')
        .get(auctions.getAll)
        .post(authenticate.loginRequired, auctions.create);

    app.route(rootUrl + '/auctions/categories')
        .get(auctions.getCategories);

    app.route(rootUrl + '/auctions/:id')
        .get(auctions.get)
        .patch(authenticate.loginRequired, auctions.edit)
        .delete(authenticate.loginRequired, auctions.remove);

    app.route(rootUrl + '/auctions/:id/bids')
        .get(auctions.getBids)
        .post(authenticate.loginRequired, auctions.placeBid)

    app.route(rootUrl + '/auctions/:id/image')
        .get(auctions.getImage)
        .put(authenticate.loginRequired, auctions.setImage)
};
