import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ethers } from "ethers";
import fs from "fs";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import auth from "./middleware/authMiddleware.js";
import { fetchAllCampaigns } from "./utils/blockchain.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
(async () => {
  await connectDB();
})();

let contract = null;
try {
  if (process.env.RPC_URL && process.env.PRIVATE_KEY && process.env.CONTRACT_ADDRESS) {
    const abi = JSON.parse(fs.readFileSync("./abi/CrowdFund.json")).abi;
    
    // Suppress provider network detection error spam during initialization
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    let suppressErrors = true;
    
    process.stderr.write = (chunk, encoding, fd) => {
      if (suppressErrors && typeof chunk === 'string' && chunk.includes('JsonRpcProvider failed to detect network')) {
        return true;
      }
      return originalStderrWrite(chunk, encoding, fd);
    };
    
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);
    
    console.log("✅ Blockchain connected successfully");
    
    // Restore stderr after provider initialization (3 seconds should be enough)
    setTimeout(() => {
      suppressErrors = false;
      process.stderr.write = originalStderrWrite;
    }, 3000);
  } else {
    console.log("⚠️  Blockchain env vars not set - blockchain routes will fail");
  }
} catch (err) {
  console.error("❌ Blockchain setup error:", err.message);
  console.log("⚠️  Blockchain routes will not work until configured");
}

app.use("/auth", authRoutes);
app.use("/campaign-db", campaignRoutes);

app.get("/test", (req, res) => {
  res.json({ message: "Server is running!" });
});

// 1. Create campaign on blockchain
app.post("/createCampaign", auth, async (req, res) => {
  if (!contract) {
    return res.status(503).json({
      success: false,
      error: "Blockchain not configured. Check RPC_URL, PRIVATE_KEY, and CONTRACT_ADDRESS in .env",
    });
  }

  const { title, description, goal, durationInDays } = req.body;
  const userId = req.user; // From auth middleware

  if (!title || !description || goal === undefined || goal === null) {
    return res.status(400).json({
      success: false,
      error: "title, description and goal are required",
    });
  }

  try {
    const goalWei = ethers.parseEther(goal.toString());
    const duration = BigInt(durationInDays ?? 30);

    const tx = await contract.createCampaign(
      title,
      description,
      goalWei,
      duration
    );

    await tx.wait();

    // Get the campaign ID (campaignCount after creation)
    const campaignCount = await contract.campaignCount();
    const campaignId = Number(campaignCount);

    // Store campaign creator mapping in MongoDB (optional)
    try {
      const mongoose = (await import("mongoose")).default;
      if (mongoose.connection.readyState === 1) {
        const Campaign = (await import("./models/Campaign.js")).default;
        await Campaign.create({
          title,
          description,
          targetEth: parseFloat(goal),
          creator: userId,
          txHash: tx.hash,
          campaignId: campaignId,
        });
      }
    } catch (dbErr) {
      // MongoDB storage failed - optional, campaign is already on blockchain
    }

    res.json({
      success: true,
      message: "Campaign created!",
      txHash: tx.hash,
      campaignId: campaignId,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err?.shortMessage || err?.message,
    });
  }
});

// 2. Donate to a campaign
app.post("/donate", async (req, res) => {
  if (!contract) {
    return res.status(503).json({
      success: false,
      error: "Blockchain not configured",
    });
  }

  const { id, amount } = req.body;

  try {
    const campaignId = BigInt(id);
    const value = ethers.parseEther(amount.toString());

    const tx = await contract.fund(campaignId, { value });
    await tx.wait();

    res.json({
      success: true,
      message: "Donation successful!",
      txHash: tx.hash,
    });
  } catch (err) {
    res.status(500).json({
      error: err?.shortMessage || err?.message,
    });
  }
});

// 3. Get single campaign (Blockchain)
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

// 4. Get all blockchain campaigns
app.get("/campaigns", async (_req, res) => {
  if (!contract) {
    return res.status(503).json({ error: "Blockchain not configured" });
  }

  try {
    const campaigns = await fetchAllCampaigns(contract);
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch campaigns" });
  }
});

// 5. Get campaigns created by logged-in user
// Blockchain is source of truth - MongoDB is just metadata for tracking ownership
app.get("/my-campaigns", auth, async (req, res) => {
  if (!contract) {
    return res.status(503).json({ error: "Blockchain not configured" });
  }

  try {
    const userId = req.user;
    const mongoose = (await import("mongoose")).default;
    
    // Get all campaigns from blockchain (source of truth)
    const allCampaigns = await fetchAllCampaigns(contract);
    const blockchainCampaignIds = allCampaigns.map(c => Number(c.id));
    
    let userCampaignIds = [];
    
    if (mongoose.connection.readyState === 1) {
      try {
        const Campaign = (await import("./models/Campaign.js")).default;
        
        // Get user's campaigns from MongoDB
        const myCampaigns = await Campaign.find({ creator: userId, deleted: { $ne: true } });
        userCampaignIds = myCampaigns
          .map(c => c.campaignId)
          .filter(id => id != null && id !== undefined)
          .map(id => Number(id));
        
        // Clean up stale MongoDB entries (campaigns that don't exist on blockchain anymore)
        const staleCampaigns = myCampaigns.filter(c => !blockchainCampaignIds.includes(Number(c.campaignId)));
        if (staleCampaigns.length > 0) {
          await Campaign.deleteMany({ 
            _id: { $in: staleCampaigns.map(c => c._id) }
          });
        }
      } catch (dbErr) {
        // MongoDB query failed - continue without MongoDB
      }
    }
    
    // Filter blockchain campaigns by MongoDB ownership records
    // If MongoDB is not connected or has no records, return empty array
    const filteredCampaigns = allCampaigns.filter(c => userCampaignIds.includes(Number(c.id)));
    res.json(filteredCampaigns);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch your campaigns" });
  }
});

// 6. Helper endpoint to link ALL existing blockchain campaigns to current user
// This syncs MongoDB with blockchain - blockchain is source of truth
app.post("/link-my-campaigns", auth, async (req, res) => {
  if (!contract) {
    return res.status(503).json({ error: "Blockchain not configured" });
  }

  try {
    const userId = req.user;
    const mongoose = (await import("mongoose")).default;
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: "MongoDB not connected. Please connect MongoDB first.",
        hint: "Check your MONGO_URI in .env file"
      });
    }

    const Campaign = (await import("./models/Campaign.js")).default;
    const allCampaigns = await fetchAllCampaigns(contract);
    
    const linkedCampaigns = [];
    
    // Sync MongoDB with blockchain - blockchain is source of truth
    for (const campaign of allCampaigns) {
      const existing = await Campaign.findOne({ campaignId: campaign.id });
      
      if (!existing) {
        // Create MongoDB entry linking campaign to user
        const newCampaign = await Campaign.create({
          title: campaign.title,
          description: campaign.description,
          targetEth: parseFloat(campaign.goal),
          creator: userId,
          campaignId: campaign.id,
          txHash: "linked",
        });
        linkedCampaigns.push(newCampaign);
      } else if (existing.creator.toString() !== userId.toString()) {
        // Update ownership if different user
        existing.creator = userId;
        await existing.save();
        linkedCampaigns.push(existing);
      }
    }
    
    // Remove MongoDB entries for campaigns that no longer exist on blockchain
    const blockchainCampaignIds = allCampaigns.map(c => c.id);
    const deletedCount = await Campaign.deleteMany({
      campaignId: { $nin: blockchainCampaignIds }
    });

    res.json({
      success: true,
      message: `Synced MongoDB with blockchain`,
      campaignsLinked: linkedCampaigns.length,
      campaignsRemoved: deletedCount.deletedCount,
      totalBlockchainCampaigns: allCampaigns.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not link campaigns: " + err.message });
  }
});

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});

