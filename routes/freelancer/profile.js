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

     try {
    
            const jsonData = JSON.parse(req.body.data);
            const { name,
                    bio} = jsonData;
            console.log(name)
    
            const result = await cloudinary.uploader.upload(req.file.path, {
                public_id: `${req.user._id}_profile`,
                width: 500,
                height: 500,
                crop: 'fill',
            });
    
            const image=result.url;

        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { image, name, bio },
            { new: true, runValidators: true } // Option to return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            image: image,
            name: name,
            bio: bio,
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }
});

router.post('/get-basic-info', fetchusers, async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await Users.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            image: user.image,
            name: user.name,
            bio: user.bio,
        });
    } catch (error) {
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

router.post('/get-professional-summary', fetchusers, async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await Users.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            about: user.about,
            skills: user.skills,
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }
});

router.post('/add-education', fetchusers, async (req, res) => {
    
    const userId = req.user.id;
    const { inst_name, degree, start_year, end_year } = req.body;

    try {
        
        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { $push: { education: { inst_name, degree, start_year, end_year } } },
            { new: true, runValidators: true } // Option to return the updated document
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

router.post('/update-education', fetchusers, async (req, res) => {
    
    try {
        const userId = req.user.id; // Main document ID
        const { inst_name, degree, start_year, end_year, _id } = req.body; // Education fields and education document ID

        // Find the user by ID
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find the education entry by its ID
        const education = user.education.id(_id);
        if (!education) {
            return res.status(404).json({ error: 'Education entry not found' });
        }

        // Update the education entry fields
        education.inst_name = inst_name || education.inst_name;
        education.degree = degree || education.degree;
        education.start_year = start_year || education.start_year;
        education.end_year = end_year || education.end_year;

        // Save the updated user document
        await user.save();

        res.status(200).json({ message: 'Education entry updated successfully', education });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/get-educations', fetchusers, async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await Users.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            education: user.education,
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }

});

router.post('/add-experience', fetchusers, async (req, res) => {
    
    const userId = req.user.id;
    const { company_name, position, start_date, end_date } = req.body;

    try {
        
        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { $push: { experience: { company_name, position, start_date, end_date } } },
            { new: true, runValidators: true } // Option to return the updated document
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


router.post('/update-experience', fetchusers, async (req, res) => {
    
    try {
        const userId = req.user.id; // Main document ID
        const { company_name, position, start_date, end_date, _id } = req.body; // Experience fields and experience document ID

        // Find the user by ID
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find the experience entry by its ID
        const experience = user.experience.id(_id);
        if (!experience) {
            return res.status(404).json({ error: 'Experience entry not found' });
        }

        // Update the experience entry fields
        experience.company_name = company_name || experience.company_name;
        experience.position = position || experience.position;
        experience.start_date = start_date || experience.start_date;
        experience.end_date = end_date || experience.end_date;

        // Save the updated user document
        await user.save();

        res.status(200).json({ message: 'Experience entry updated successfully', experience });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/get-experiences', fetchusers, async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await Users.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            experience: user.experience,
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }

});

router.post('/add-project', fetchusers, async (req, res) => {
    
    const userId = req.user.id;
    const { proj_name, desc, link } = req.body;

    try {
        
        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { $push: { projects: { proj_name, desc, link } } },
            { new: true, runValidators: true } // Option to return the updated document
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

router.post('/get-projects', fetchusers, async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await Users.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).send({
            projects: user.projects,
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }

});

router.post('/update-project', fetchusers, async (req, res) => {
    
    try {
        const userId = req.user.id; // Main document ID
        const { proj_name, desc, link, _id } = req.body; // Project fields and project document ID

        // Find the user by ID
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find the project entry by its ID
        const project = user.projects.id(_id);
        if (!project) {
            return res.status(404).json({ error: 'Project entry not found' });
        }

        // Update the project entry fields
        project.proj_name = proj_name || project.proj_name;
        project.desc = desc || project.desc;
        project.link = link || project.link;

        // Save the updated user document
        await user.save();

        res.status(200).json({ message: 'Project entry updated successfully', project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



module.exports = router