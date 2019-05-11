require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const models = require('../models');
const mailer = require('../middleware/mail');

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

async function getUserInfo(req, res) {
  try {
    const userInfo = await models.User.findAll({
    });
    if (userInfo) {
      res.status(200).json({
        success: true,
        user_list: userInfo,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'no userInfo',
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
}

async function getFeedback(req, res) {
  try {
    const feedbackInfo = await models.Feedback.findAll({
    });
    if (feedbackInfo) {
      res.status(200).json({
        success: true,
        feedback_list: feedbackInfo,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'no Feedback',
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
}

async function getUserHistory(req, res) {
  const { phone } = req.query;
  try {
    const list = await models.User.findOne({
      where: {
        phone,
      },
      include: [{
        model: models.Purchase_list,
        required: true,
      }],
    });
    if (list.purchase_lists) {
      res.status(200).json({
        success: true,
        purchase_list: list.purchase_lists,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'no purchase_lists',
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
}

async function logout(req, res) {
  return res.status(200).json({ success: true });
}

async function newAdmin(req, res) {
  const { email } = req.body;
  try {
    const userInfo = await models.User.findOne({
      where: {
        email,
      },
    });
    if (!userInfo) {
      res.status(500).json({
        success: false,
        message: 'no User',
      });
    }
    await models.Admin.create({
      email,
      password: userInfo.password,
      name: userInfo.name,
      phone: userInfo.phone,
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    return res.status(500).json(
      {
        success: false,
        message: 'Server Error',
      },
    );
  }
}

async function sendMail(req, res) {
  const { email } = req.body;
  const { content } = req.body;
  try {
    await mailer(email, '안녕하세요 쿠레이트 입니다.', content);
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: 'Mail Server Error',
    });
  }
}

async function deleteUserInfo(req, res) {
  const { email } = req.body;
  try {
    await models.User.destroy({
      where: { email },
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
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
