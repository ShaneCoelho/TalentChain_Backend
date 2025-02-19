const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const fetchusers = require('../../middleware/fetchusers');
const router = express.Router();
const Users = mongoose.model('Users');

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


module.exports = router