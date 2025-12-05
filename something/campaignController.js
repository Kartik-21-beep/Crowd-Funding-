import Campaign from "../models/Campaign.js";

export const createCampaign = async (req, res) => {
  const { title, description, targetEth, txHash } = req.body;

  try {
    const campaign = new Campaign({
      title,
      description,
      targetEth,
      txHash,
      creator: req.user,
    });

    await campaign.save();
    res.json({ msg: "Campaign created", campaign });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
};

export const getCampaigns = async (_req, res) => {
  try {
    const campaigns = await Campaign.find().populate("creator", "name email");
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
};

export const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate("creator", "name email");
    if (!campaign) return res.status(404).json({ msg: "Not found" });

    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
};
