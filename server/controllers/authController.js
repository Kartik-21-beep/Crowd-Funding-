// controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/sendEmail.js";
import { generateToken } from "../utils/jwt.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ success: false, message: "Invalid email" });
    if (password.length < 6) return res.status(400).json({ success: false, message: "Password too short (min 6 chars)" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const user = await User.create({
      name,
      email,
      password: hashed,
      otp,
      otpExpire: Date.now() + 10 * 60 * 1000,
      isVerified: false,
    });

    try {
      await sendEmail(email, "Your OTP Code", `Your OTP is: ${otp}. It expires in 10 minutes.`);
      return res.json({ success: true, message: "OTP sent to your email", email });
    } catch (mailErr) {
      // still created user; return OTP in response for dev/testing only if ENABLE_INSECURE_OTP env true
      if (process.env.ENABLE_INSECURE_OTP === "true") {
        return res.json({ success: true, message: "Account created but email failed. OTP returned (dev only)", otp });
      }
      return res.json({ success: true, message: "Account created but email failed. Please contact admin" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Signup failed: " + err.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "Invalid email" });

    if (user.isVerified) return res.status(400).json({ success: false, message: "Already verified" });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: "Incorrect OTP" });
    if (user.otpExpire < Date.now()) return res.status(400).json({ success: false, message: "OTP expired" });

    user.isVerified = true;
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    const token = generateToken(user._id, user.email);
    res.json({ success: true, message: "Verified", token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: "OTP verification failed: " + err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });

    if (!user.isVerified) return res.status(401).json({ success: false, error: "Please verify your email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: "Invalid credentials" });

    const token = generateToken(user._id, user.email);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Login failed: " + err.message });
  }
};
