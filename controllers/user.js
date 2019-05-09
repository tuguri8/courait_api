require('dotenv').config();
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

}

async function feedback(req, res) {

}

async function withdrawl(req, res) {

}


module.exports = {
  updateBudget,
  getBudget,
  logout,
  feedback,
  withdrawl,
};
