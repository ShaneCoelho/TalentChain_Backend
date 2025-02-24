const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const fetchusers = require('../../middleware/fetchusers');
const router = express.Router();
const multer = require('multer');
const Users = mongoose.model('Users');


router.post('/explore-campaigns', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.body; // Get page & limit from request
        const skip = (page - 1) * limit;

        // Fetch only necessary fields
        const campaigns = await Users.find({ role: "startup" })
            .select("image name campaigns")
            .slice("campaigns", [skip, limit]); // Slice campaigns at DB level

        let campaignArray = [];

        campaigns.forEach(campaign => {
            campaign.campaigns.forEach(camp => {
                campaignArray.push({
                    startupImage: campaign.image,
                    campaignName: camp.name,
                    startupName: campaign.name,
                    campaignStartDate: camp.start_date,
                    campaignBudget: camp.prize,
                    startupId: campaign._id,
                    campaignId: camp._id,
                    skills: camp.skills
                });
            });
        });

        const totalCampaigns = await Users.aggregate([
            { $match: { role: "startup" } },
            { $unwind: "$campaigns" },
            { $count: "total" }
        ]);

        const totalRecords = totalCampaigns.length > 0 ? totalCampaigns[0].total : 0;
        const hasNextPage = skip + limit < totalRecords;

        res.send({
            campaigns: campaignArray,
            nextPage: hasNextPage ? page + 1 : null
        });

    } catch (err) {
        return res.status(500).send({ error: "Internal server error" });
    }
});



//Create a route which receives the campaign id and startup id and returns the campaign details to the frontend.
router.post('/campaign-details', async (req, res) => {
    try {
        const { startupId, campaignId } = req.body;
        const startup = await Users.findById(startupId);
        let campaign;
        startup.campaigns.forEach(camp => {
            if (camp._id == campaignId) {
                campaign = camp;
            }
        });
        res.send(campaign);
    } catch (err) {
        return res.status(500).send({ error: "Internal server error" });
    }
})


//Create a route which receives campaign id, startup id and freelancer id and adds the freelancer to the interested array of the campaign.
router.post('/show-interest', fetchusers, async (req, res) => {
    try {
        const { startupId, campaignId } = req.body;
        const freelancerId = req.user.id;
        const startup = await Users.findById(startupId);
        let campaign;
        startup.campaigns.forEach(camp => {
            if (camp._id == campaignId) {
                camp.interested.push(freelancerId);
                campaign = camp;
            }
        });
        await startup.save();
        res.send(campaign);
    } catch (err) {
        return res.status(500).send({ error: "Internal server error" });
    }
})


module.exports = router