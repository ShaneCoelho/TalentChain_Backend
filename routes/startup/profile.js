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

router.post('/startupregister', fetchusers, async (req, res) => {

    const userId = req.user.id;
    const { name, regno, companytype, existingUser, role } = req.body;

    try {

        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { name, regno, companytype, existingUser, role },
            { new: true, runValidators: true } // Option to return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            role: role,
            name: name,
            image: req.user.image || null, // Send null if image is not provided
        });
    } catch (error) {

        res.status(500).json({ message: "An error occurred", error });
    }
});

router.post('/get-profile', fetchusers, async (req, res) => {
    try {
        const startupId = req.user.id;

        // Fetch the startup by ID and select the required fields
        const startup = await Users.findById(startupId).select(
            "image name email regno companytype"
        );

        if (!startup) {
            return res.status(404).json({ error: "Startup not found" });
        }

        // Send the startup's profile details as the response
        res.status(200).json({
            profileImage: startup.image,
            name: startup.name,
            email: startup.email,
            regno: startup.regno,
            companyType: startup.companytype
        });
    } catch (error) {
        console.error('Error in /view-startup-profile:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.post('/update-profile', fetchusers, uploads.single('photo'), async (req, res) => {
    try {

        const startupId = req.user.id;

        const { name, email, regno, companytype } = req.body;

        let image;
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                public_id: `${req.user._id}_profile`,
                width: 500,
                height: 500,
                crop: 'fill',
            });
            image = result.url;
        }

        const updatePayload = { name, email, regno, companytype };
        if (image) updatePayload.image = image;

        const updatedStartup = await Users.findByIdAndUpdate(
            startupId,
            updatePayload,
            { new: true, runValidators: true }
        );

        if (!updatedStartup) {
            return res.status(404).json({ error: "Startup not found" });
        }

        // Send the updated startup's profile details as the response
        res.status(200).json({
            message: "Startup profile updated successfully",
            profile: {
                profileImage: updatedStartup.image,
                name: updatedStartup.name,
                email: updatedStartup.email,
                regno: updatedStartup.regno,
                companyType: updatedStartup.companytype
            }
        });
    } catch (error) {
        console.error('Error in /update-startup-profile:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});


module.exports = router