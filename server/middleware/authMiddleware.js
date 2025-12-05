// middleware/authMiddleware.js
import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = header.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) return res.status(401).json({ error: "Invalid token" });

    const user = await User.findById(decoded.id).select("-password -otp -otpExpire");
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user._id; // attach id for use in controllers
    req.userObj = user; // optional full user
    next();
  } catch (err) {
    return res.status(401).json({ error: "Auth failed: " + (err.message || err) });
  }
};

export default auth;
