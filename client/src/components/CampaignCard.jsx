import { useNavigate } from "react-router-dom";

const CampaignCard = ({ campaign }) => {
  const navigate = useNavigate();
  const progress = parseFloat(campaign.goal) > 0 
    ? (parseFloat(campaign.raised) / parseFloat(campaign.goal)) * 100 
    : 0;

  return (
    <div
      onClick={() => navigate(`/campaign/${campaign.id}`)}
      style={{
        border: "1px solid #ccc",
        padding: 20,
        borderRadius: 8,
        cursor: "pointer",
        transition: "box-shadow 0.3s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <h3 style={{ marginTop: 0 }}>{campaign.title || "Untitled Campaign"}</h3>
      <p style={{ color: "#666", marginBottom: "10px" }}>
        {campaign.description || "No description"}
      </p>
      <p><strong>Goal:</strong> {campaign.goal} ETH</p>
      <p><strong>Raised:</strong> {campaign.raised} ETH</p>
      <div style={{
        width: "100%",
        height: "10px",
        background: "#f0f0f0",
        borderRadius: "5px",
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
      <p style={{ marginTop: "10px", fontSize: "12px", color: "#999" }}>
        Click to view details
      </p>
    </div>
  );
};

export default CampaignCard;
