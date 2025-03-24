const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const fetchusers = require('../../middleware/fetchusers');
const router = express.Router();
const multer = require('multer');
const Users = mongoose.model('Users');
const cloudinary = require('../../helper/imageUpload')

const storage = multer.diskStorage({});

const fileFilter = (req, file, cb) => {
  console.log(file)
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb('invalid image file!', false);
  }
};
const uploads = multer({ storage, fileFilter });

router.post('/create-campaign', fetchusers, async (req, res) => {

    if (!req.user)
        return res
            .status(401)
            .json({ success: false, message: 'unauthorized access!' });

    try {

        const { name,
                desc,
                prize,
                app_link,
                guide_link,
                documentation_link,
                forum_link,
                skills,
                repository} = req.body;
       

        const user = await Users.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create a new campaign object
        const newCampaign = {
            name,
            desc,
            prize,
            app_link,
            guide_link,
            documentation_link,
            forum_link,
            skills,
            repository
        };

        // Add the campaign to the user's campaigns array
        user.campaigns.push(newCampaign);

        // Save the user document
        await user.save();

        res.status(201).json({ message: 'Campaign added successfully', campaign: newCampaign });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }

})

router.post('/manage-campaign', fetchusers, async (req, res) => {

    if (!req.user)
        return res
            .status(401)
            .json({ success: false, message: 'unauthorized access!' });

    try {
        const user = await Users.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const campaigns = user.campaigns.map(campaign => ({
            id: campaign._id,
            name: campaign.name,
            start_date: campaign.start_date,
            prize: campaign.prize,
            status: campaign.status
        }));

        res.status(200).json({ campaigns });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

//create a route that receives user id and campaign id from the frontend and returns the details of the campaign, assigned_to users name and image, interested users name and image. The campaign schema includes interested and assigned_to fields which are arrays of user ids. You need to populate these fields to get the user details. 

router.post('/view_campaign', async (req, res) => {
    try {
        const { campaignId } = req.body;

        // Fetch user and campaign details
        const user = await Users.findOne({ "campaigns._id": campaignId }, { "campaigns.$": 1 });
        if (!user || !user.campaigns.length) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        
        const campaign = user.campaigns[0];

        // Fetch assigned users' details
        const assignedUsers = await Users.find({ _id: { $in: campaign.assigned_to } }, '_id name image');

        // Fetch interested users' details
        const interestedUsers = await Users.find({ _id: { $in: campaign.interested } }, '_id name image');

        res.json({
            campaign,
            assignedUsers,
            interestedUsers
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

//assigning a freelancer who is interested to a campaign and updating the status of the campaign to assigned. The route should receive the campaign id and the freelancer id and startup id from the frontend.

router.post('/assign-campaign', fetchusers, async (req, res) => {
    if (!req.user)
        return res
            .status(401)
            .json({ success: false, message: 'unauthorized access!' });

    try {
        const { campaignId, freelancerId } = req.body;

        // Fetch the startup and check if the campaign exists
        const user = await Users.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'Startup not found' });
        }

        const campaign = user.campaigns.id(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Check if the campaign is already assigned
        if (campaign.status === 'Assigned') {
            return res.status(400).json({ message: 'Campaign already assigned' });
        }

        

        // Assign the freelancer to the campaign
        campaign.assigned_to.push(freelancerId);
        campaign.status = 'Assigned';

        // Remove the freelancer from the interested list
        const index = campaign.interested.indexOf(freelancerId);
        if (index > -1) {
            campaign.interested.splice(index, 1);
        }

        // Save the user document
        await user.save();

        res.json({ message: 'Campaign assigned successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router