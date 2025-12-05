// models/Campaign.js
import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
  title: String,
  description: String,
  targetEth: Number,
  raisedEth: { type: Number, default: 0 }, // Amount raised (synced from blockchain)
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  txHash: String,
  campaignId: Number, // Blockchain campaign ID
  deleted: { type: Boolean, default: false }, // soft delete for admin operations
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Campaign", campaignSchema);
