import mongoose from "mongoose";

const tempUserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,   // hashed
  otp: String,
  otpExpires: Date
});

export default mongoose.model("TempUser", tempUserSchema);
