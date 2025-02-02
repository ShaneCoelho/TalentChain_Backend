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


module.exports = router