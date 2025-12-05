// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CrowdFund {
    struct Campaign {
        address creator;
        string title;
        string description;
        uint goal;
        uint deadline;
        uint amountCollected;
        mapping(address => uint) contributions;
    }

    uint public campaignCount;
    mapping(uint => Campaign) public campaigns;

    event CampaignCreated(uint campaignId, address creator, uint goal, uint deadline);
    event Funded(uint campaignId, address contributor, uint amount);

    function createCampaign(
        string memory _title,
        string memory _description,
        uint _goal,
        uint _durationInDays
    ) external {
        require(_goal > 0, "Goal must be > 0");

        campaignCount++;
        Campaign storage c = campaigns[campaignCount];

        c.creator = msg.sender;
        c.title = _title;
        c.description = _description;
        c.goal = _goal;
        c.deadline = block.timestamp + (_durationInDays * 1 days);

        emit CampaignCreated(campaignCount, msg.sender, _goal, c.deadline);
    }

    function fund(uint _id) external payable {
        Campaign storage c = campaigns[_id];

        require(block.timestamp < c.deadline, "Campaign ended");
        require(msg.value > 0, "Must send ETH to fund");

        c.amountCollected += msg.value;
        c.contributions[msg.sender] += msg.value;

        emit Funded(_id, msg.sender, msg.value);
    }

    function getCampaign(uint _id)
        external
        view
        returns (
            address creator,
            string memory title,
            string memory description,
            uint goal,
            uint deadline,
            uint amountCollected
        )
    {
        Campaign storage c = campaigns[_id];
        return (c.creator, c.title, c.description, c.goal, c.deadline, c.amountCollected);
    }
}
