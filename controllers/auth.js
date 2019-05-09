require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const models = require('../models');

function login(req, res) {
  models.User.findOne({
    where: {
      email: req.body.email,
    },
  }).then((user) => {
    const decipher = crypto.createDecipher('aes192', process.env.crypto_secret);
    decipher.update(user.password, 'base64', 'utf8');
    const decipheredPassword = decipher.final('utf8');
    if (req.body.password === decipheredPassword) {
      const token = jwt.sign({
        email: user.email,
      }, process.env.jwt_secret,
      {
        expiresIn: '7d',
      });
      return res.status(200).json({
        success: true,
        token,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'email or password incorrect',
    });
  }).catch((err) => {
    console.log(err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  });
}

async function register(req, res) {

}

async function searchID(req, res) {

}

async function searchPW(req, res) {

}

module.exports = {
  login,
  register,
  searchID,
  searchPW,
};
