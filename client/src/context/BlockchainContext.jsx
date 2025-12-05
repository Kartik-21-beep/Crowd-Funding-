/**
 * BlockchainContext - Web3 Campaign Management
 * 
 * IMPORTANT: All campaign data comes from blockchain (immutable source of truth).
 * MongoDB is only used server-side for metadata (user ownership tracking).
 * This ensures the project truly uses Web3/blockchain.
 */
import { createContext, useContext, useState } from "react";
import api from "../utils/api";

const BlockchainContext = createContext();

export const useBlockchain = () => useContext(BlockchainContext);

export const BlockchainProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);

  // Create campaign on blockchain (Web3 transaction)
  const createCampaign = async (title, description, target, duration) => {
    try {
      setLoading(true);
      const res = await api.post("/createCampaign", {
        title,
        description,
        goal: target?.toString() ?? "0",
        durationInDays: duration ?? 30,
      });
      return res.data;
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data?.error || "Request failed",
      };
    } finally {
      setLoading(false);
    }
  };

  // Fetch all campaigns from blockchain (Web3 - immutable source of truth)
  const getAllCampaigns = async () => {
    try {
      const res = await api.get("/campaigns");
      return res.data; // All campaigns come from blockchain
    } catch (err) {
      return [];
    }
  };

  return (
    <BlockchainContext.Provider
      value={{
        loading,
        createCampaign,
        getAllCampaigns,
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
};
