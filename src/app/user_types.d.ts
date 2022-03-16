type User = {
    /**
     * User id as defined by the database
     */
    id: number,
    /**
     * Users email as entered when created
     */
    email: string,
    /**
     * Users first name as entered when created
     */
    first_name: string,
    /**
     * Users last name as entered when created
     */
    last_name: string,
    /**
     * Users image file location
     */
    image_filename: string,
    /**
     * Users password as entered when created
     */
    password: string,
    /**
     * Users token from last login
     */
    auth_token: string,
}
