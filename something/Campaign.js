import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
  title: String,
  description: String,
  targetEth: Number,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  txHash: String,
  campaignId: Number, // Blockchain campaign ID
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Campaign", campaignSchema);
