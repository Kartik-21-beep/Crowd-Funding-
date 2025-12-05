import express from "express";
import auth from "../middleware/authMiddleware.js";
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
} from "../controllers/campaignController.js";

const router = express.Router();

router.post("/create", auth, createCampaign);
router.get("/", getCampaigns);
router.get("/:id", getCampaignById);

export default router;


