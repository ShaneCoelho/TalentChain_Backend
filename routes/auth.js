const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
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


module.exports = router