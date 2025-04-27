const express = require('express')
const mongoose = require('mongoose')
const router = express.Router();
const Users = mongoose.model('Users');

router.post('/leaderboard', async (req, res) => {
    try {
        // Fetch all freelancers and calculate their stats
        const freelancers = await Users.find({ role: 'freelancer' }).select("name image assigned_campaigns rewardsreceived");

        // Map freelancers to include the required stats
        const leaderboard = freelancers.map(freelancer => {
            const campaignsDone = freelancer.rewardsreceived.length;
            const rewards = freelancer.rewardsreceived.reduce((sum, reward) => sum + (reward.prize || 0), 0);
            const ongoingCampaigns = freelancer.assigned_campaigns.length;

            return {
                name: freelancer.name,
                profileImage: freelancer.image,
                ongoingCampaigns,
                campaignsDone,
                rewards
            };
        });

        // Sort the leaderboard by campaignsDone in descending order and assign ranks
        leaderboard.sort((a, b) => b.campaignsDone - a.campaignsDone);
        leaderboard.forEach((freelancer, index) => {
            freelancer.rank = index + 1;
        });

        // Send the leaderboard as the response
        res.status(200).json(leaderboard);
    } catch (err) {
        console.error('Error in /leaderboard:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router