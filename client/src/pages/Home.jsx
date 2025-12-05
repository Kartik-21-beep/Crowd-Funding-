import { useEffect, useState } from "react";
import { useBlockchain } from "../context/BlockchainContext";
import CampaignCard from "../components/CampaignCard";

const Home = () => {
  const { getAllCampaigns } = useBlockchain();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getAllCampaigns();
      setCampaigns(data);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <p>Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>All Campaigns</h2>

      {campaigns.length === 0 ? (
        <p>No campaigns found. Be the first to create one!</p>
      ) : (
        <div style={{ display: "grid", gap: "20px", marginTop: "20px" }}>
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
          </div>
      )}
    </div>
  );
};

export default Home;
