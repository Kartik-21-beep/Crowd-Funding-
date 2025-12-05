// config/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set in .env");
  await mongoose.connect(uri, {
    // mongoose 7+ has defaults; options kept minimal
  });
  console.log("MongoDB connected");
};

export default connectDB;
