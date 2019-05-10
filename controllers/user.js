require('dotenv').config();
const moment = require('moment');
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
    return res.status(500).json({ success: false });
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
    return res.status(500).json({ success: false });
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
    return res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
}

async function withdrawl(req, res) {
  const { email } = req.decoded;
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
  updateBudget,
  getBudget,
  logout,
  feedback,
  withdrawl,
};
