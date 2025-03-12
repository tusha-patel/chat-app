import mongoose from "mongoose";

// connect the mongoDB database
const connectDB = async () => {
    try {
        let connect = await mongoose.connect(process.env.MONGODB_URL);
        console.log(`MongoDB connected : ${connect.connection.host} `);

    } catch (error) {
        console.log("MongoDB connection error", error);
    }
}


export default connectDB;