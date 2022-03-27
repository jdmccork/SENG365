type Auction = {
    /**
     * Auction id as defined by the database
     */
    id: number,
    /**
     * The title of the auction as entered when created
     */
    title: string,
    /**
     * Id of the category the auction belongs to as entered when created
     */
    categoryId: number,
    /**
     * The id of the user hosting the auction
     */
    sellerId: number,
    /**
     * The first name of the user hosting the auction
     */
    sellerFirstName: string,
    /**
     * The last name of the user hosting the auction
     */
    sellerLastName: string,
     /**
     * The auctions reserve price as entered when created
     */
    reserve: number,
    /**
     * The number of bids placed on the auction
     */
    numBids: number,
    /**
     * The highest amount placed on a bid in the auction
     */
    highestBid: number,
    /**
     * Description of the auction as entered when created
     */
    description: string,
    /**
     * End date of the auction as entered when created
     */
    endDate: string,
    /**
     * Users image file location
     */
    imageFilename: string,
}
