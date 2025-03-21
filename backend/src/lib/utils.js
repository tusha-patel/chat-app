import jwt from "jsonwebtoken";

// generate the jwt token
export const generateToken = (userId, res) => {
    try {
        // create the token
        const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
            expiresIn: "7d"
        });
        // set the token in cookie
        res.cookie("jwt", token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV !== "development"
        });
        return token
    } catch (error) {
        console.log(error, "token not created error");
        throw new Error("token not created")
    }
}