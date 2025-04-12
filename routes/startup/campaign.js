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

router.post('/view_campaign', fetchusers, async (req, res) => {
    const {userId}=req.user._id;
    const {campaignId } = req.body;

    try {
        // Find the user who owns the campaign
        const user = await Users.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the campaign in the user's campaigns array
        const campaign = user.campaigns.id(campaignId);

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Get assigned_to and interested user details
        const assignedUsers = await Users.find({
            _id: { $in: campaign.assigned_to }
        }).select('name image');

        const interestedUsers = await Users.find({
            _id: { $in: campaign.interested }
        }).select('name image');

        //Get approval user namees and image
        const approvalUsers = await Users.find({
            _id: { $in: campaign.approval }
        }).select('name image');

        // Respond with campaign and populated data
        res.status(200).json({
            campaign,
            assignedUsers,
            interestedUsers,
            approvalUsers
        });

    } catch (error) {
        console.error('Error fetching campaign details:', error);
        res.status(500).json({ message: 'Internal server error' });
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

        //Update the freelancer's applied_campaigns array to include the assigned campaign startup id and campaign id also delete the campaign id and startup id from the applied_campaigns array of the freelancer.
        const freelancer = await Users.findById(freelancerId);
        if (!freelancer) {
            return res.status(404).json({ message: 'Freelancer not found' });
        }
        const appliedCampaignIndex = freelancer.applied_campaigns.findIndex(camp => camp.campaignId === campaignId && camp.startupId === req.user._id);
        if (appliedCampaignIndex > -1) {
            freelancer.applied_campaigns.splice(appliedCampaignIndex, 1);
        }
        freelancer.assigned_campaigns.push({ campaignId, startupId: req.user._id });
        // Save the freelancer document
        await freelancer.save();
        

        // Save the user document
        await user.save();

        res.json({ message: 'Campaign assigned successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

//create a route that receives the startup id, campaign id and freelancer id from the frontend and removes the freelancer id from the assigned_to array and approval array of the campaign and also removes the campaign id and startup id from the assigned_campaigns array of the freelancer and adds the campaign id and startup id to completed_campaigns array of the freelancer. The route should also update the status of the campaign to completed.

router.post('/complete-campaign', fetchusers, async (req, res) => {
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

        // Check if the campaign is already completed
        if (campaign.status === 'Completed') {
            return res.status(400).json({ message: 'Campaign already completed' });
        }

        

        // Remove the freelancer from the assigned list and approval list
        const index = campaign.assigned_to.indexOf(freelancerId);
        if (index > -1) {
            campaign.assigned_to.splice(index, 1);
        }
        
        const approvalIndex = campaign.approval.indexOf(freelancerId);
        if (approvalIndex > -1) {
            campaign.approval.splice(approvalIndex, 1);
        }

        

        // Update the status of the campaign to completed
        campaign.status = 'Completed';

        

        //Update the freelancer's assigned_campaigns array to remove the assigned campaign startup id and campaign id and add the campaign id and startup id to completed_campaigns array of the freelancer.
        const freelancer = await Users.findById(freelancerId);
        if (!freelancer) {
            return res.status(404).json({ message: 'Freelancer not found' });
        }
        const assignedCampaignIndex = freelancer.assigned_campaigns.findIndex(camp => camp.campaignId === campaignId && camp.startupId === req.user._id);
        if (assignedCampaignIndex > -1) {
            freelancer.assigned_campaigns.splice(assignedCampaignIndex, 1);
        }
        freelancer.completed_campaigns.push({ campaignId, startupId: req.user._id });
        // Save the freelancer document
        await freelancer.save();

        // Save the user document
        await user.save();

        res.json({ message: 'Campaign completed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}
);

//create a route to update the campaign details. The route should receive the campaign id and startup id and the updated details from the frontend and update the campaign details in the database.

router.post('/update-campaign', fetchusers, async (req, res) => {
    if (!req.user)
        return res
            .status(401)
            .json({ success: false, message: 'unauthorized access!' });

    try {
        const { campaignId, name, desc, prize, app_link, guide_link, documentation_link, forum_link, skills, repository } = req.body;

        // Fetch the startup and check if the campaign exists
        const user = await Users.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'Startup not found' });
        }

        const campaign = user.campaigns.id(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Update the campaign details
        campaign.name = name;
        campaign.desc = desc;
        campaign.prize = prize;
        campaign.app_link = app_link;
        campaign.guide_link = guide_link;
        campaign.documentation_link = documentation_link;
        campaign.forum_link = forum_link;
        campaign.skills = skills;
        campaign.repository = repository;

        // Save the user document
        await user.save();

        res.json({ message: 'Campaign updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}
);

module.exports = router