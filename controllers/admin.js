require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const models = require('../models');

function login(req, res) {
  models.Admin.findOne({
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
        expiresIn: '60m',
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

async function getUserInfo(req, res) {

}

async function getFeedback(req, res) {

}

async function getUserHistory(req, res) {

}

async function logout(req, res) {

}

async function newAdmin(req, res) {

}

async function sendMail(req, res) {

}

async function deleteUserInfo(req, res) {

}

module.exports = {
  login,
  getUserInfo,
  getFeedback,
  getUserHistory,
  logout,
  newAdmin,
  sendMail,
  deleteUserInfo,
};
