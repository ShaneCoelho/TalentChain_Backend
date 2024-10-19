const axios = require('axios');
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken');
const { oauth2Client } = require('../utils/googleClient');
const Users = mongoose.model('Users');

/* GET Google Authentication API. */
exports.googleAuth = async (req, res, next) => {
    const code = req.query.code;
    try {
        const googleRes = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(googleRes.tokens);
        const userRes = await axios.get(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
        );
        const { email, name, picture } = userRes.data;
        // console.log(userRes);
        let user = await Users.findOne({ email });

        if (!user) {
            user = await Users.create({
                name,
                email,
                image: picture,
            });
        }

        const existingUser = user.existingUser;
        const role = user.role;
        const { _id } = user;
        const token = jwt.sign({ userId: _id }, process.env.JWT_SECRET);
        res.status(200).json({
            message: 'success',
            token,
            user,
            existingUser,
            role
        });
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
};