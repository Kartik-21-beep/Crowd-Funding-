import { useState } from "react";
import { useBlockchain } from "../context/BlockchainContext";

const CreateCampaign = () => {
  const { createCampaign, loading } = useBlockchain();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [duration, setDuration] = useState(30);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Send full data: title, description, target (goal) and duration
    const res = await createCampaign(title, description, target, duration);

    if (res.success) {
      alert("Campaign Created! Tx Hash: " + res.txHash);
      setTitle("");
      setDescription("");
      setTarget("");
      setDuration(30);
    } else {
      alert(res.error || "Error creating campaign");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Create New Campaign</h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxWidth: 400 }}>
        <input
          type="text"
          placeholder="Campaign Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ marginBottom: 10, padding: 8 }}
        />

        <textarea
          placeholder="Campaign Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          style={{ marginBottom: 10, padding: 8 }}
        />

        <input
          type="number"
          placeholder="Target (ETH)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
          style={{ marginBottom: 10, padding: 8 }}
        />

        <input
          type="number"
          placeholder="Duration (days)"
          value={duration}
          min={1}
          onChange={(e) => setDuration(e.target.value)}
          required
          style={{ marginBottom: 10, padding: 8 }}
        />

        <button disabled={loading} style={{ padding: 10, background: "#333", color: "#fff" }}>
          {loading ? "Creating..." : "Create Campaign"}
        </button>
      </form>
    </div>
  );
};

export default CreateCampaign;
