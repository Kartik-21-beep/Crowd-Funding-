// utils/jwt.js
import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET || "change_this_secret";

export const generateToken = (userId, email) => {
  return jwt.sign({ id: userId, email }, SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};
