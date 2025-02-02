const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const fetchusers = require('../../middleware/fetchusers');
const router = express.Router();
const multer = require('multer');
const Users = mongoose.model('Users');


router.post('/explore-campaigns', async (req, res) => {
    // explore all the campaigns created by startups. It must send Startup image, Campaign name, Startup name, Campaign start date, Campaign budget, StartUp id and Campaign id to the frontend.
    try {
        const campaigns = await Users.find({ role: "startup" });
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
                    campaignId: camp._id
                });
            });
        });
        res.send(campaignArray);
    } catch (err) {
        return res.status(500).send({ error: "Internal server error" });
    }

})


module.exports = router