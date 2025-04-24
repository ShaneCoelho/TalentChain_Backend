const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const fetchusers = require('../middleware/fetchusers');
const router = express.Router();
const Users = mongoose.model('Users');
const { googleAuth } = require('../controllers/authController');

router.get("/google", googleAuth);


router.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    const image = "https://firebasestorage.googleapis.com/v0/b/crewconnect-f0163.appspot.com/o/No_Profile.jpg?alt=media&token=8b69af1a-73ba-4b10-b25c-4a41137874ad&_gl=1*199to8y*_ga*MTQwODQ3ODc3Mi4xNjk3MzA4MTEw*_ga_CW55HF8NVT*MTY5NzUxNzAyOS42LjEuMTY5NzUxNzA4Ni4zLjAuMA..";

    try {

        const existingUser = await Users.findOne({ email });
        if (existingUser) {
            return res.status(409).send({ message: 'User Already Exist' });
        }

        const user = new Users({ email, password, image });
        await user.save();
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET)
        res.send({ token })
    } catch (err) {
        return res.status(422).send(err.message)
    }

})

router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(422).send({ error: "Must provide username and password" });
    }

    try {
        const user = await Users.findOne({ email });
        if (!user) {
            return res.status(401).send({ error: "Invalid credentials" });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).send({ error: "Invalid credentials" });
        }

        const role = user.role;
        const existingUser = user.existingUser;
        const name=user.name;
        const image=user.image;

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.send({ token, role, existingUser, name, image });
    } catch (err) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

router.post('/user_is', fetchusers, async (req, res) => {

    const userId = req.user.id;
    try {
        // Find the user by ID
        const user = await Users.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the role field
        res.status(200).send({
            role: user.role,
            name: user.name,
            image: user.image || null, // Send null if image is not provided
        });
    } catch (error) {
        console.error('Error fetching user role:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

//create a route that receives the user id and wallet address and updates the wallet address of the user in the database
router.post('/updatewallet', fetchusers, async (req, res) => {
    const userId = req.user.id;
    const { walletaddress } = req.body;

    try {
        // Find the user by ID and update the wallet address
        const user = await Users.findByIdAndUpdate(userId, { walletaddress }, { new: true });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Wallet address updated successfully', user });
    } catch (error) {
        console.error('Error updating wallet address:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
);

module.exports = router