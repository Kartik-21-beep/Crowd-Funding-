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

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashed,
      otp,
      otpExpire: Date.now() + 10 * 60 * 1000 // valid 10 minutes
    });

    try {
      await sendEmail(email, "Your OTP Verification Code", `Your OTP is: ${otp}`);
      res.json({ success: true, message: "OTP sent to your email!", email });
    } catch (emailErr) {
      res.json({ success: true, message: "Account created but email failed. OTP: " + otp, email });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Signup failed: " + err.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "Invalid email" });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Already verified! Please login." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Incorrect OTP" });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // Verify user
    user.isVerified = true;
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    const token = generateToken(user._id, user.email);

    res.json({
      success: true,
      message: "Account verified!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "OTP verification failed: " + err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    // Check if verified
    if (!user.isVerified) {
      return res.status(401).json({ success: false, error: "Please verify your email first" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.email);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Login failed: " + err.message });
  }
};
