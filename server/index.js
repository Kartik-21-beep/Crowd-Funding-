// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { ethers } from "ethers";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB().catch((err) => {
  console.error("MongoDB connection failed:", err.message);
});

// Setup blockchain contract if env present
let contract = null;
if (process.env.RPC_URL && process.env.PRIVATE_KEY && process.env.CONTRACT_ADDRESS) {
  try {
    const abiPath = "./abi/CrowdFund.json";
    if (!fs.existsSync(abiPath)) {
      console.warn("ABI file not found at ./abi/CrowdFund.json — blockchain routes will fail until ABI is provided.");
    } else {
      const abi = JSON.parse(fs.readFileSync(abiPath)).abi;
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);
      console.log("✅ Blockchain connected");
    }
  } catch (err) {
    console.error("Blockchain init error:", err.message);
  }
} else {
  console.log("⚠️ Blockchain env vars not set. Set RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS if you want blockchain features.");
}

// Attach contract to app locals for controllers to use
app.locals.contract = contract;

app.use("/auth", authRoutes);
// MongoDB routes are for admin/metadata only - NOT used by frontend
// Frontend MUST use blockchain endpoints below to prove Web3 usage
app.use("/campaign-db", campaignRoutes);

// ============================================================================
// BLOCKCHAIN ENDPOINTS - Source of Truth
// ============================================================================
// IMPORTANT: All campaign data displayed in the UI MUST come from blockchain.
// MongoDB is ONLY used for metadata (user ownership tracking, search, etc.)
// This ensures the project truly uses Web3/blockchain as immutable storage.
// ============================================================================

import auth from "./middleware/authMiddleware.js";

// Get all campaigns from blockchain (ONLY blockchain - no MongoDB)
app.get("/campaigns", async (req, res) => {
  if (!contract) {
    return res.status(503).json({ error: "Blockchain not configured" });
  }
  try {
    const total = Number(await contract.campaignCount());
    const campaigns = [];
    
    // Campaigns are 1-indexed in most contracts
    for (let i = 1; i <= total; i++) {
      try {
        const data = await contract.campaigns(BigInt(i));
        campaigns.push({
          id: i,
          owner: data.creator,
          title: data.title,
          description: data.description,
          goal: ethers.formatEther(data.goal),
          deadline: data.deadline.toString(),
          raised: ethers.formatEther(data.amountCollected),
        });
      } catch (err) {
        // Skip if campaign doesn't exist
      }
    }
    
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch campaigns" });
  }
});

// Create campaign on blockchain (MongoDB metadata is optional)
app.post("/createCampaign", auth, async (req, res) => {
  if (!contract) {
    return res.status(503).json({ success: false, error: "Blockchain not configured" });
  }
  
  const { title, description, goal, durationInDays } = req.body;
  const userId = req.user;
  
  if (!title || !description || goal === undefined || goal === null) {
    return res.status(400).json({ success: false, error: "title, description and goal are required" });
  }
  
  try {
    const goalWei = ethers.parseEther(goal.toString());
    const duration = BigInt(durationInDays ?? 30);
    
    const tx = await contract.createCampaign(title, description, goalWei, duration);
    await tx.wait();
    
    const campaignCount = await contract.campaignCount();
    const campaignId = Number(campaignCount);
    
    // Store metadata in MongoDB (optional - for user ownership tracking only)
    // Campaign data itself is stored on blockchain above
    try {
      const mongoose = (await import("mongoose")).default;
      if (mongoose.connection.readyState === 1) {
        const Campaign = (await import("./models/Campaign.js")).default;
        await Campaign.create({
          title,
          description,
          targetEth: parseFloat(goal),
          raisedEth: 0, // Initialize raised amount to 0
          creator: userId,
          txHash: tx.hash,
          campaignId: campaignId,
        });
      }
    } catch (dbErr) {
      // MongoDB metadata storage failed - non-critical, campaign is on blockchain
    }
    
    res.json({ success: true, message: "Campaign created!", txHash: tx.hash, campaignId });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.shortMessage || err?.message });
  }
});

// Donate to campaign
app.post("/donate", async (req, res) => {
  if (!contract) {
    return res.status(503).json({ success: false, error: "Blockchain not configured" });
  }
  
  const { id, amount } = req.body;
  
  try {
    const campaignId = BigInt(id);
    const value = ethers.parseEther(amount.toString());
    
    // Execute donation on blockchain
    const tx = await contract.fund(campaignId, { value });
    await tx.wait();
    
    // Update MongoDB with latest raised amount from blockchain
    try {
      const mongoose = (await import("mongoose")).default;
      if (mongoose.connection.readyState === 1) {
        const Campaign = (await import("./models/Campaign.js")).default;
        // Fetch updated amount from blockchain
        const campaignData = await contract.campaigns(campaignId);
        const raisedEth = parseFloat(ethers.formatEther(campaignData.amountCollected));
        
        // Update MongoDB campaign metadata
        await Campaign.findOneAndUpdate(
          { campaignId: Number(id) },
          { raisedEth: raisedEth },
          { new: true }
        );
      }
    } catch (dbErr) {
      // MongoDB update failed - non-critical, donation succeeded on blockchain
    }
    
    res.json({ success: true, message: "Donation successful!", txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err?.shortMessage || err?.message });
  }
});

// Get single campaign from blockchain (ONLY blockchain - no MongoDB)
app.get("/campaign/:id", async (req, res) => {
  if (!contract) {
    return res.status(503).json({ error: "Blockchain not configured" });
  }
  try {
    const id = BigInt(req.params.id);
    const total = await contract.campaignCount();
    if (id > total) return res.status(404).json({ error: "Not found" });
    const data = await contract.campaigns(id);
    const formatted = {
      creator: data.creator,
      title: data.title,
      description: data.description,
      goalEth: ethers.formatEther(data.goal),
      amountCollectedEth: ethers.formatEther(data.amountCollected),
      deadline: data.deadline.toString(),
    };
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch campaign" });
  }
});

// Get campaigns created by logged-in user
// Returns campaigns from MongoDB only (user-specific ownership data)
app.get("/my-campaigns", auth, async (req, res) => {
  try {
    const userId = req.user;
    const mongoose = (await import("mongoose")).default;
    
    if (mongoose.connection.readyState !== 1) {
      // MongoDB not connected - return empty
      return res.json([]);
    }
    
    const Campaign = (await import("./models/Campaign.js")).default;
    const myCampaigns = await Campaign.find({ creator: userId, deleted: { $ne: true } })
      .select("-__v")
      .sort({ createdAt: -1 }); // Most recent first
    
    // Format MongoDB data to match frontend expectations
    const formattedCampaigns = myCampaigns.map(campaign => ({
      id: campaign.campaignId || campaign._id,
      title: campaign.title || "Untitled Campaign",
      description: campaign.description || "No description",
      goal: campaign.targetEth?.toString() || "0",
      raised: campaign.raisedEth?.toString() || "0", // Synced from blockchain after donations
      deadline: campaign.createdAt ? Math.floor(new Date(campaign.createdAt).getTime() / 1000).toString() : "0",
      txHash: campaign.txHash,
      createdAt: campaign.createdAt,
    }));
    
    res.json(formattedCampaigns);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch your campaigns" });
  }
});

app.get("/test", (_req, res) => res.json({ message: "Server running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
