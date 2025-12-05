// src/pages/CreateCampaign.jsx
import React, { useState } from "react";
import { useBlockchain } from "../context/BlockchainContext";

const CreateCampaign = () => {
  const { createCampaign, loading } = useBlockchain();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [duration, setDuration] = useState(30);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !target) return alert("Fill all fields");
    const res = await createCampaign(title, description, target, duration);
    if (res.success) {
      alert("Campaign created! " + (res.txHash ? "Tx: " + res.txHash : ""));
      setTitle(""); setDescription(""); setTarget(""); setDuration(30);
    } else {
      alert("Error: " + res.error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Create New Campaign</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxWidth: 600 }}>
        <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ marginBottom: 10, padding: 8 }} />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required style={{ marginBottom: 10, padding: 8 }} />
        <input type="number" placeholder="Target (ETH)" value={target} onChange={(e) => setTarget(e.target.value)} required style={{ marginBottom: 10, padding: 8 }} />
        <input type="number" placeholder="Duration (days)" value={duration} min={1} onChange={(e) => setDuration(e.target.value)} required style={{ marginBottom: 10, padding: 8 }} />
        <button disabled={loading} style={{ padding: 10 }}>{loading ? "Creating..." : "Create Campaign"}</button>
      </form>
    </div>
  );
};

export default CreateCampaign;
