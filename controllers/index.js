require('dotenv').config()
const models = require('../models');
const moment = require('moment');


function login (req, res) {
  models.User.findOne({
    where: {
        email: req.body.email
    }
  }).then(user => {
    let decipher = crypto.createDecipher('aes192', process.env.crypto_secret);
    decipher.update(user.password, 'base64', 'utf8');
    let decipheredPassword = decipher.final('utf8');
    if(req.body.password === decipheredPassword) {
      let token = jwt.sign({
        email: user.email
      }, process.env.jwt_secret,
    	{
    		expiresIn: '60m'
    	});
      return res.status(200).json({
        success: true,
        token: token
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "email or password incorrect"
      });
    }
  }).catch(err => {
    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  });
}

function verifyToken (req, res) {
  let token = req.body.token;
  if(token) {
    let decoded = jwt.verify(token, process.env.jwt_secret);
    if(decoded) {
      return res.status(500).json({
        success: false,
        email: decoded.email
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "token error"
      });
    }
  } else {
    return res.status(500).json({
      success: false,
      message: "token error"
    });
  }
}

async function getByMonth (req,res) {
  let datePrice = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0,"6": 0, "7": 0, "8": 0, "9": 0, "10": 0,"11": 0, "12": 0, "13": 0, "14": 0, "15": 0,"16": 0,"17": 0, "18": 0, "19": 0, "20": 0, "21": 0, "22": 0, "23": 0, "24": 0, "25": 0, "26": 0, "27": 0, "28": 0, "29": 0, "30": 0, "31": 0};
  const email = req.body.email;
  const month = req.body.month;
  try {
    let list = await models.User.findOne({
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), month),
        required: true
      }],
    });
    if (list){
      console.log(list);
      list = list.purchase_lists;
      let totalPrice = 0;
      list.forEach((data) => {
        let dataDay = moment(data.purchase_date).format('D');
        datePrice[dataDay] += data.price;
        totalPrice += data.price;
      });
      return res.status(200).json({monthPrice: totalPrice, dayPrice: datePrice, list: list});
    } else {
      return res.status(403).json({success: false, message: "결과없음"});
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({success: false});
  }
}

async function getByDay (req,res) {
  const email = req.body.email;
  const month = req.body.month;
  const day = req.body.day;
  try {
    let list = models.User.findOne({
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.and((models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), month)),
        (models.sequelize.where(models.sequelize.fn('DAY', models.sequelize.col('purchase_date')), day))),
        required: true
      }],
    });
    if (list){
      console.log(list);
      list = list.purchase_lists;
      return res.status(200).json({success: true, list: list});
    } else {
      return res.status(403).json({success: false, message: "결과없음"});
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({success: false});
  }
}

async function comparePrevMonth (req,res) {
  const email = req.body.email;
  const month = req.body.month;
  try {
    let prevTotalPrice = 0;
    let nowTotalPrice = 0;
    let diffPrice;
    let now_list = await models.User.findOne({
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), month),
        required: true
      }],
    });
    let prev_list = await models.User.findOne({
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), moment(month,'M').subtract(1, 'months').format('M')),
        required: true
      }],
    });
    if (prev_list) {
      prev_list = prev_list.purchase_lists;
      prev_list.forEach((data) => {
        prevTotalPrice += data.price;
      });
    }
    if (now_list) {
      now_list = now_list.purchase_lists;
      now_list.forEach((data) => {
         nowTotalPrice += data.price;
      });
    }
    diffPrice = nowTotalPrice - prevTotalPrice;
    return res.status(200).json({success: true, prevMonth: prevTotalPrice, nowMonth: nowTotalPrice, price: diffPrice});
  } catch (e) {
    console.log(e);
    return res.status(500).json({success: false});
  }
}

async function percentByCategory (req,res) {
  // let datePrice = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0,"6": 0, "7": 0, "8": 0, "9": 0, "10": 0,"11": 0, "12": 0, "13": 0, "14": 0, "15": 0,"16": 0,"17": 0, "18": 0, "19": 0, "20": 0, "21": 0, "22": 0, "23": 0, "24": 0, "25": 0, "26": 0, "27": 0, "28": 0, "29": 0, "30": 0, "31": 0};
  const email = req.body.email;
  const month = req.body.month;
  const category = req.body.category;
  try {
    let list = await models.User.findOne({
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.and((models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), month)),
        ({category: category})),
        required: true
      }],
    });
    if (list){
      console.log(list);
      list = list.purchase_lists;
      // let totalPrice = 0;
      // list.forEach((data) => {
      //   let dataDay = moment(data.purchase_date).format('D');
      //   datePrice[dataDay] += data.price;
      //   totalPrice += data.price;
      // });
      return res.status(200).json({list: list});
    } else {
      return res.status(403).json({success: false, message: "결과없음"});
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({success: false});
  }
}

module.exports = {
    login: login,
    verifyToken: verifyToken,
    getByMonth: getByMonth,
    getByDay: getByDay,
    comparePrevMonth: comparePrevMonth,
    percentByCategory: percentByCategory,
}
