require('dotenv').config();
const moment = require('moment');
const crypto = require('crypto');
const models = require('../models');

async function updateBudget(req, res) {
  const { email } = req.decoded;
  const { budget } = req.body;
  try {
    await models.User.update(
      {
        budget: parseInt(budget),
      },
      {
        where: { email },
      },
    );
    return res.status(200).json({ success: true, email, budget });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: 'Server Erorr' });
  }
}

async function getBudget(req, res) {
  const { email } = req.decoded;
  try {
    const userInfo = await models.User.findOne({
      where: { email },
    });
    return res.status(200).json({ success: true, email, budget: userInfo.budget });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: 'Server Erorr' });
  }
}

async function logout(req, res) {
  return res.status(200).json({ success: true });
}

async function feedback(req, res) {
  const { email } = req.decoded;
  const { content } = req.body;
  try {
    const userInfo = await models.User.findOne({
      where: { email },
    });
    await models.Feedback.create({
      email: userInfo.email,
      name: userInfo.name,
      content,
      date: moment().format('YYYY-M-D'),
    });
    return res.status(200).json({ success: true, message: '문의가 접수되었습니다' });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: 'Server Erorr' });
  }
}

async function withdrawl(req, res) {
  const { email } = req.decoded;
  const { password } = req.body;
  const { user_password } = req.decoded;
  try {
    const decipher = crypto.createDecipher('aes192', process.env.crypto_secret);
    decipher.update(user_password, 'base64', 'utf8');
    const decipheredPassword = decipher.final('utf8');
    if (password === decipheredPassword) {
      await models.User.destroy({
        where: { email },
      });
      return res.status(200).json({ success: true, message: '회원탈퇴가 완료되었습니다' });
    } else {
      return res.status(501).json({ success: false, message: '비밀번호가 올바르지 않습니다.' });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: 'Server Erorr' });
  }
}


module.exports = {
  updateBudget,
  getBudget,
  logout,
  feedback,
  withdrawl,
};
