// routes/campaignRoutes.js
import express from "express";
import auth from "../middleware/authMiddleware.js";
import {
  createCampaignOnBlockchain,
  donateToCampaign,
  getCampaignFromBlockchain,
  getAllBlockchainCampaigns,
  createCampaignInDB,
  getCampaignsFromDB,
  getCampaignByIdFromDB,
} from "../controllers/campaignController.js";

const router = express.Router();

// Blockchain endpoints (frontend should use these)
router.post("/create", auth, createCampaignOnBlockchain); // POST /campaign-db/create  (keeps route group consistent)
router.post("/donate", donateToCampaign); // optional — no auth required if using signer in backend
router.get("/b/:id", getCampaignFromBlockchain); // GET single campaign from blockchain
router.get("/b", getAllBlockchainCampaigns); // GET all blockchain campaigns

// MongoDB metadata (admin / optional)
router.post("/db-create", auth, createCampaignInDB);
router.get("/db", getCampaignsFromDB);
router.get("/db/:id", getCampaignByIdFromDB);

export default router;
