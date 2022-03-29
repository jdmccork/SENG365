type AuctionBid = {

    bidderId: number,
    /**
     * Auction id as defined by the database
     */
    amount: number,
    /**
     * Category name as entered when created
     */
    firstName: string,
    lastName: string
    timestamp: string
}
