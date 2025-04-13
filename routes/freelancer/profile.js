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

router.post('/freelancerregister', fetchusers, async (req, res) => {

    const userId = req.user.id;
    const { name, phone, skills, existingUser, role } = req.body;

    try {

        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { name, phone, skills, existingUser, role },
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


router.post('/basic-info', fetchusers, uploads.single('photo'), async (req, res) => {
    const userId = req.user.id;

    // The following route will receive name, email, phone and image. The image will be uploaded to cloudinary and the url will be updated in the database along with the name, email and phone.
    const { name, email, phone } = req.body;
    const result = await cloudinary.uploader.upload(req.file.path, {
        public_id: `${req.user._id}_profile`,
        width: 500,
        height: 500,
        crop: 'fill',
    });

    const image = result.url;

    try {
        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { name, email, phone, image: image },
            { new: true, runValidators: true } // Option to return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            name: name,
            email: email,
            phone: phone,
            image: image,
        });
    }
    catch (error) {

        res.status(500).json({ message: "An error occurred", error });
    }
});


router.post('/professional-summary', fetchusers, async (req, res) => {

    const userId = req.user.id;
    const { about, skills } = req.body;

    try {

        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { about, skills },
            { new: true, runValidators: true } // Option to return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            about: about,
            skills: skills,
        });
    } catch (error) {

        res.status(500).json({ message: "An error occurred", error });
    }
});

//provide me an route that receives the freelancer id and array of education objects and updates the education array of the user with the new array of education objects
router.post('/update-education', fetchusers, async (req, res) => {
    const userId = req.user.id;
    const { education } = req.body;

    try {
        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { education },
            { new: true, runValidators: true }
        );


        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            education: updatedUser.education,
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }
});


router.post('/update-experience', fetchusers, async (req, res) => {
    const userId = req.user.id;
    const { experience } = req.body;

    try {
        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { experience },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            experience: updatedUser.experience,
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }
});

router.post('/update-projects', fetchusers, async (req, res) => {
    const userId = req.user.id;
    const { projects } = req.body;

    try {
        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { projects },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            projects: updatedUser.projects,
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }
});

//create an route that receives freelancer id, about, skills and updates the about and skills of the user
router.post('/update-about-skills', fetchusers, async (req, res) => {
    const userId = req.user.id;
    const { about, skills } = req.body;

    try {
        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { about, skills },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            about: updatedUser.about,
            skills: updatedUser.skills,
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }
});


//create a route which receives the user id and returns the user name, image, email, phone, about, skills, education, experience and projects of the user
router.post('/get-profile', fetchusers, async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await Users.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            name: user.name,
            image: user.image,
            email: user.email,
            phone: user.phone,
            about: user.about,
            skills: user.skills,
            education: user.education,
            experience: user.experience,
            projects: user.projects
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }

});



module.exports = router