// utils/blockchain.js
/**
 * Helper to read all campaigns from the contract (v6 ethers style)
 * Expects `contract` to have: campaignCount() and campaigns(id)
 */
export const fetchAllCampaigns = async (contract) => {
  if (!contract) throw new Error("Contract not provided");
  const countBn = await contract.campaignCount();
  const count = Number(countBn);
  const out = [];

  // campaigns are usually indexed starting from 0 or 1 depending on contract; adjust if needed
  for (let i = 0; i < count; i++) {
    try {
      const data = await contract.campaigns(BigInt(i));
      out.push({
        id: i,
        creator: data.creator,
        title: data.title,
        description: data.description,
        goal: (data.goal ? (typeof data.goal === "bigint" ? data.goal.toString() : data.goal._hex) : "0"),
        amountCollected: (data.amountCollected ? data.amountCollected.toString() : "0"),
        deadline: data.deadline ? data.deadline.toString() : null,
      });
    } catch (err) {
      // skip malformed
    }
  }

  // normalize numeric fields using contract utils (consumer can format with ethers.formatEther)
  return out.map((c) => ({
    id: c.id,
    creator: c.creator,
    title: c.title,
    description: c.description,
    goal: c.goal,
    amountCollected: c.amountCollected,
    deadline: c.deadline,
  }));
};
