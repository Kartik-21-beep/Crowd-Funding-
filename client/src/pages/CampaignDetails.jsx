import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [donating, setDonating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await api.get(`/campaign/${id}`);
        setCampaign(res.data);
      } catch (err) {
        setError("Campaign not found");
      }
    };

    fetchCampaign();
  }, [id]);

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      setError("Please enter a valid donation amount");
      return;
    }

    setDonating(true);
    setError("");

    try {
      const res = await api.post("/donate", {
        id: parseInt(id),
        amount: donationAmount,
      });

      if (res.data.success) {
        alert(`Donation successful! Tx Hash: ${res.data.txHash}`);
        const updated = await api.get(`/campaign/${id}`);
        setCampaign(updated.data);
        setDonationAmount("");
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Donation failed");
    } finally {
      setDonating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  if (error && !campaign) {
    return (
      <div style={{ padding: "20px" }}>
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Go Back</button>
      </div>
    );
  }

  if (!campaign) {
    return <div style={{ padding: "20px" }}>Loading campaign...</div>;
  }

  const progress = campaign.goalEth > 0 
    ? (parseFloat(campaign.amountCollectedEth) / parseFloat(campaign.goalEth)) * 100 
    : 0;

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <button onClick={() => navigate("/home")} style={{ marginBottom: "20px" }}>
        ← Back to Home
      </button>

      <h1>{campaign.title || "Untitled Campaign"}</h1>
      <p style={{ fontSize: "16px", marginBottom: "20px" }}>
        {campaign.description || "No description"}
      </p>

      <div style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
        <h3>Campaign Details</h3>
        <p><strong>Creator:</strong> {campaign.creator}</p>
        <p><strong>Goal:</strong> {campaign.goalEth} ETH</p>
        <p><strong>Raised:</strong> {campaign.amountCollectedEth} ETH</p>
        <p><strong>Progress:</strong> {progress.toFixed(2)}%</p>
        
        <div style={{ 
          width: "100%", 
          height: "20px", 
          background: "#f0f0f0", 
          borderRadius: "10px", 
          marginTop: "10px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${Math.min(progress, 100)}%`,
            height: "100%",
            background: "#4CAF50",
            transition: "width 0.3s"
          }}></div>
        </div>

        {campaign.deadline && (
          <p style={{ marginTop: "10px" }}>
            <strong>Deadline:</strong> {new Date(parseInt(campaign.deadline) * 1000).toLocaleDateString()}
          </p>
        )}
      </div>

      <div style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px" }}>
        <h3>Make a Donation</h3>
        
        {error && (
          <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
        )}

        <form onSubmit={handleDonate} style={{ display: "flex", flexDirection: "column", maxWidth: "400px" }}>
          <input
            type="number"
            step="0.001"
            placeholder="Amount (ETH)"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            required
            style={{ marginBottom: 10, padding: 8 }}
          />

          <button
            type="submit"
            disabled={donating}
            style={{ padding: 10, background: "#333", color: "#fff", cursor: "pointer" }}
          >
            {donating ? "Processing..." : "Donate"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CampaignDetails;

