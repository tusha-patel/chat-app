import jwt from "jsonwebtoken"
import User from "../models/user.model.js";



const protectRoute = async (req, res, next) => {
    try {
        // take the token
        let token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({
                message: "Unauthorized_ no token provided"
            });
        }

        // verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized_Invalid token" });
        }

        // user found without the password
        const user = await User.findById(decoded.userId).select("-password")

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.log("Error in protect route middleware", error.message);
        res.status(500).json({ message: "Internal Server Error " })
    }
}


export default protectRoute;