require('dotenv').config()
const models = require('../models');
const moment = require('moment');
const rp = require('request-promise');
const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
let driver = new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options().addArguments('--headless')).build();
const cheerio = require('cheerio');

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

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
  if(day === parseInt(moment().format('D'))) {
    let purchaseList = [];
    const asyncForEach = async (array, callback) => {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
      }
    };
    let userInfo = await models.User.findAll({
      where: {
          email: email
      }
    });
    try {
      let category = null;
      let food_category = null;
      for (let i = 0; i < 101; i+=5) {
        await driver.get(`https://my.coupang.com/purchase/list?year=2019&startIndex=${i}&orderTab=ALL_ORDER`);
        if(i == 0) {
          await driver.findElement(By.id('login-email-input')).sendKeys(userInfo.coupang_id);
          await sleep(1000);
          await driver.findElement(By.id('login-password-input')).sendKeys(userInfo.coupang_pw);
          await driver.findElement(By.className('login__button')).click();
          await sleep(1000);
        }
        driver.getPageSource().then((title) => {
          const $ = cheerio.load(title);
          if($('#listContainer > div.my-purchase-list__no-result.my-color--gray.my-font--14').text().includes('없습니다')) {
            i = 999;
          } else {
            $('#listContainer > div.my-purchase-list__item').each(function (idx){
              let date = $(this).children('div.my-purchase-list__item-head.my-row.my-font--16.my-font--gothic').children('div.my-purchase-list__item-info.my-col').children('span').children('span').text();
              let name = $(this).children('div.my-purchase-list__item-units').children('table').children('tbody').children('tr:nth-child(3)').children('td.my-order-unit__area-item-group').children('div').children('div').children('div.my-order-unit__item-info').children('a').children('div').children('strong').last().text();
              if (date === moment().format('YYYY/M/D')) {
                purchaseList.push({name: name, category: category, food_caegory: food_category, date: date});
              }
            });
          }
        });
        await sleep(1000);
      }
      await driver.get('https://login.coupang.com/login/logout.pang?rtnUrl=https%3A%2F%2Fwww.coupang.com%2Fnp%2Fpost%2Flogout%3Fr%3Dhttps%253A%252F%252Fmy.coupang.com%252Fpurchase%252Flist%253Fyear%253D2019%2526startIndex%253D5%2526orderTab%253DALL_ORDER');
      await asyncForEach(purchaseList, async (data, idx) => {
        let options = {
          method: 'POST',
          uri: 'http://ec2-13-124-76-148.ap-northeast-2.compute.amazonaws.com:8000/categorize/',
          body: {
              content: name
          },
          json: true // Automatically stringifies the body to JSON
        };
        const nlpResult = await rp(options);
        category = nlpResult.category;
        data.category = category;
        if(category === "food") {
          let options2 = {
            method: 'POST',
            uri: 'http://ec2-13-124-76-148.ap-northeast-2.compute.amazonaws.com:8000/food_categorize/',
            body: {
                content: name
            },
            json: true // Automatically stringifies the body to JSON
          };
          const nlpResult2 = await rp(options2);
          food_category = nlpResult2.category;
          data.food_category = food_category;
        }
      });
      console.log(purchaseList);
      if(purchaseList) {
        return res.status(200).json({success: true, list: purchaseList});
      } else {
        return res.status(403).json({success: false, message: "결과없음"});
      }
    } catch(err) {
      console.log(err);
      return res.status(500).json({success: false});
    } finally {
      console.log('finish');
      await sleep(1000);
      await driver.quit();
    }
  } else {
    try {
      let list = await models.User.findOne({
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
      let total = list.length;
      let fashion = 0;
      let care = 0;
      let digit = 0;
      let interior = 0;
      let kid = 0;
      let food = 0;
      let sports = 0;
      let life = 0;
      let culture = 0;
      list.forEach((data) => {
        switch (data.category) {
          case '패션':
            fashion++;
          break;
          case '화장품/미용':
            care++;
          break;
          case '디지털/가전':
            digit++;
          break;
          case '가구/인테리어':
            interior++;
          break;
          case '출산/육아':
            kid++;
          break;
          case '식품':
            food++;
          break;
          case '스포츠/레저':
            sports++;
          break;
          case '생활/건강':
            life++;
          break;
          case '여행/문화':
            culture++;
          break;
        }
      });
      const result = {
        fashion: Math.round(fashion/total * 100),
        care: Math.round(care/total * 100),
        digit: Math.round(digit/total * 100),
        interior: Math.round(interior/total * 100),
        kid: Math.round(kid/total * 100),
        food: Math.round(food/total * 100),
        sports: Math.round(sports/total * 100),
        life: Math.round(life/total * 100),
        culture: Math.round(culture/total * 100),
      }
      return res.status(200).json({success: true, result: result});
    } else {
      return res.status(403).json({success: false, message: "결과없음"});
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({success: false});
  }
}

async function getByCategory (req,res) {
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
      let totalPrice = 0;
      list.forEach((data) => {
        totalPrice += data.price;
      });
      return res.status(200).json({success: true, category: category, price: totalPrice, list: list});
    } else {
      return res.status(403).json({success: false, message: "결과없음"});
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({success: false});
  }
}

async function updateBudget (req,res) {
  const email = req.body.email;
  const budget = req.body.budget;
  try {
    await models.User.update(
      {
        budget: parseInt(budget),
      },
      {where: {
              email: email}
      });
      return res.status(200).json({success: true, email: email, budget: budget});
  } catch (e) {
    console.log(e);
    return res.status(500).json({success: false});
  }
}

async function getBudget (req,res) {
  const email = req.body.email;
  try {
    let userInfo = await models.User.findOne({
      where: {
          email: email
      }
    });
    return res.status(200).json({success: true, email: email, budget: userInfo.budget});
  } catch (e) {
    console.log(e);
    return res.status(500).json({success: false});
  }
}

async function compareByBudget (req,res) {
  const email = req.body.email;
  const month = moment().format('M');
  try {
    let monthlyPrice = 0;
    const userInfo = await models.User.findOne({
      where: {
          email: email
      }
    });
    const budget = userInfo.budget;
    let list = await models.User.findOne({
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), parseInt(month)),
        required: true
      }],
    });
    if (list){
      list = list.purchase_lists;
      list.forEach((data) => {
        monthlyPrice += data.price;
      });
    }
    if(monthlyPrice >= budget) {
      return res.status(200).json({over: true, monthlyPrice: monthlyPrice, budget: budget, diff: monthlyPrice-budget});
    } else {
      const diff = budget-monthlyPrice;
      const remainDay = (moment().endOf('month').format('D'))-(moment().format('D'));
      const daySpend = Math.floor(diff / remainDay);
      return res.status(200).json({over: false, monthlyPrice: monthlyPrice, budget: budget, diff: diff, remainDay: remainDay, daySpend: daySpend});
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({success: false});
  }
}

async function inputPurchase (req,res) {
  const email = req.body.email;
  const name = req.body.name;
  const price = req.body.price;
  const date = moment().format('YYYY-MM-DD');
  let food_category = null;
  try {
    let options = {
      method: 'POST',
      uri: 'http://ec2-13-124-76-148.ap-northeast-2.compute.amazonaws.com:8000/categorize/',
      body: {
          content: name
      },
      json: true // Automatically stringifies the body to JSON
    };
    const nlpResult = await rp(options);
    const category = nlpResult.category;
    if(category === "food") {
      let options2 = {
        method: 'POST',
        uri: 'http://ec2-13-124-76-148.ap-northeast-2.compute.amazonaws.com:8000/food_categorize/',
        body: {
            content: name
        },
        json: true // Automatically stringifies the body to JSON
      };
      const nlpResult2 = await rp(options2);
      food_category = nlpResult2.category;
    }
    await models.Purchase_list.create({
      email: email,
      item_name: name,
      price: price,
      category: category,
      food_category: food_category,
      purchase_date:date
    });
    return res.status(200).json({success: true, email: email, item_name: name, price: price, category: category, food_category: food_category});
  } catch (e) {
    console.log(e);
    return res.status(200).json({success: false});
  }
}

module.exports = {
    login: login,
    verifyToken: verifyToken,
    getByMonth: getByMonth,
    getByDay: getByDay,
    comparePrevMonth: comparePrevMonth,
    percentByCategory: percentByCategory,
    getByCategory: getByCategory,
    updateBudget: updateBudget,
    getBudget: getBudget,
    compareByBudget: compareByBudget,
    inputPurchase: inputPurchase,
}
