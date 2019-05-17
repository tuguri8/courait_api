require('dotenv').config();
const moment = require('moment');
const rp = require('request-promise');
const {
  Builder, By,
} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const cheerio = require('cheerio');
const models = require('../models');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getByMonth(req, res) {
  const datePrice = {
    '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0, '11': 0, '12': 0, '13': 0, '14': 0, '15': 0, '16': 0, '17': 0, '18': 0, '19': 0, '20': 0, '21': 0, '22': 0, '23': 0, '24': 0, '25': 0, '26': 0, '27': 0, '28': 0, '29': 0, '30': 0, '31': 0,
  };
  const { email } = req.decoded;
  const { year } = req.query;
  const { month } = req.query;
  try {
    let list = await models.User.findOne({
      where: {
        email,
      },
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.and(
          (models.sequelize.where(models.sequelize.fn('YEAR', models.sequelize.col('purchase_date')), year)),
          (models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), month)),
        ),
        required: true,
      }],
    });
    if (list) {
      console.log(list);
      list = list.purchase_lists;
      let totalPrice = 0;
      list.forEach((data) => {
        const dataDay = moment(data.purchase_date).format('D');
        datePrice[dataDay] += data.price;
        totalPrice += data.price;
      });
      return res.status(200).json({
        success: true, month_price: totalPrice, day_price: datePrice, month_list: list,
      });
    }
    return res.status(501).json({ success: false, message: '결과없음' });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: '서버에러' });
  }
}

async function getByDay(req, res) {
  const { email } = req.decoded;
  const { year } = req.query;
  const { month } = req.query;
  const { day } = req.query;
  if (day === (moment().format('D'))) {
    const driver = new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options().addArguments('--headless').addArguments('--no-sandbox').addArguments('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36')).build();
    const purchaseList = [];
    const asyncForEach = async (array, callback) => {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    };
    const userInfo = await models.User.findOne({
      where: {
        email,
      },
    });
    try {
      // await driver.executeScript("Object.defineProperty(navigator, 'languages', {get: function() {return ['ko-KR', 'ko']}})");
      let category = null;
      let food_category = null;
      let name = null;
      for (let i = 0; i < 101; i += 5) {
        await driver.get(`https://my.coupang.com/purchase/list?year=2019&startIndex=${i}&orderTab=ALL_ORDER`);
        if (i === 0) {
          await driver.findElement(By.id('login-email-input')).sendKeys(userInfo.coupang_id);
          await sleep(1000);
          await driver.findElement(By.id('login-password-input')).sendKeys(userInfo.coupang_pw);
          await driver.findElement(By.className('login__button')).click();
          await sleep(1000);
        }
        driver.getPageSource().then((title) => {
          const $ = cheerio.load(title);
          if ($('#listContainer > div.my-purchase-list__no-result.my-color--gray.my-font--14').text().includes('없습니다')) {
            i = 999;
          } else {
            $('#listContainer > div.my-purchase-list__item').each(function (idx) {
              let price = $(this).children('div.my-purchase-list__item-units').children('table').children('tbody')
                .children('tr:nth-child(3)')
                .children('td.my-order-unit__area-item-group')
                .children('div')
                .children('div')
                .children('div.my-order-unit__item-info')
                .children('div.my-order-unit__info-ea')
                .text()
                .trim();
              price = parseInt(price.replace(/ /g, '').replace(/,/g, '').replace(/원/g, ''));
              let date = $(this).children('div.my-purchase-list__item-head.my-row.my-font--16.my-font--gothic').children('div.my-purchase-list__item-info.my-col').children('span')
                .children('span')
                .text();
              date = date.replace(/\//g, '-');
              name = $(this).children('div.my-purchase-list__item-units').children('table').children('tbody')
                .children('tr:nth-child(3)')
                .children('td.my-order-unit__area-item-group')
                .children('div')
                .children('div')
                .children('div.my-order-unit__item-info')
                .children('a')
                .children('div')
                .children('strong')
                .last()
                .text();
              if (date === moment().format('YYYY-M-D')) {
                purchaseList.push({
                  item_name: name, category, food_category, date, price,
                });
              }
            });
          }
        });
        await sleep(1000);
      }
      await driver.get('https://login.coupang.com/login/logout.pang?rtnUrl=https%3A%2F%2Fwww.coupang.com%2Fnp%2Fpost%2Flogout%3Fr%3Dhttps%253A%252F%252Fmy.coupang.com%252Fpurchase%252Flist%253Fyear%253D2019%2526startIndex%253D5%2526orderTab%253DALL_ORDER');
      await asyncForEach(purchaseList, async (data, idx) => {
        const options = {
          method: 'POST',
          uri: 'http://ec2-13-124-76-148.ap-northeast-2.compute.amazonaws.com:8000/categorize/',
          body: {
            content: name,
          },
          json: true, // Automatically stringifies the body to JSON
        };
        const nlpResult = await rp(options);
        category = nlpResult.category;
        data.category = category;
        if (category === 'food') {
          const options2 = {
            method: 'POST',
            uri: 'http://ec2-13-124-76-148.ap-northeast-2.compute.amazonaws.com:8000/food_categorize/',
            body: {
              content: name,
            },
            json: true, // Automatically stringifies the body to JSON
          };
          const nlpResult2 = await rp(options2);
          food_category = nlpResult2.category;
          data.food_category = food_category;
        }
      });
      console.log(purchaseList);
      if (purchaseList.length > 0) {
        let totalPrice = 0;
        purchaseList.forEach((data) => {
          totalPrice += data.price;
        });
        return res.status(200).json({ success: true, day_price: totalPrice, day_list: purchaseList });
      }
      return res.status(501).json({ success: false, message: '결과없음' });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: 'Server Error' });
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
          where: models.sequelize.and(
            (models.sequelize.where(models.sequelize.fn('YEAR', models.sequelize.col('purchase_date')), year)),
            (models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), month)),
            (models.sequelize.where(models.sequelize.fn('DAY', models.sequelize.col('purchase_date')), day)),
          ),
          required: true,
        }],
      });
      if (list) {
        console.log(list);
        list = list.purchase_lists;
        let totalPrice = 0;
        list.forEach((data) => {
          totalPrice += data.price;
        });
        return res.status(200).json({ success: true, day_price: totalPrice, day_list: list });
      }
      return res.status(501).json({ success: false, message: '결과없음' });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

async function comparePrevMonth(req, res) {
  const { email } = req.decoded;
  const { month } = req.query;
  try {
    let prevTotalPrice = 0;
    let nowTotalPrice = 0;
    let now_list = await models.User.findOne({
      where: {
        email,
      },
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), month),
        required: true,
      }],
    });
    let prev_list = await models.User.findOne({
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), moment(month, 'M').subtract(1, 'months').format('M')),
        required: true,
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
    const diffPrice = nowTotalPrice - prevTotalPrice;
    return res.status(200).json({
      success: true, prev_price: prevTotalPrice, now_price: nowTotalPrice, diff_price: diffPrice,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function percentByCategory(req, res) {
  const { email } = req.decoded;
  const month = moment().format('M');
  try {
    let list = await models.User.findOne({
      where: {
        email,
      },
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), month),
        required: true,
      }],
    });
    if (list) {
      console.log(list);
      list = list.purchase_lists;
      const total = list.length;
      let fashion = 0;
      let fashionPrice = 0;
      let cosmetic = 0;
      let cosmeticPrice = 0;
      let digital = 0;
      let digitalPrice = 0;
      let interior = 0;
      let interiorPrice = 0;
      let kid = 0;
      let kidPrice = 0;
      let food = 0;
      let foodPrice = 0;
      let sports = 0;
      let sportsPrice = 0;
      let life = 0;
      let lifePrice = 0;
      let culture = 0;
      let culturePrice = 0;
      list.forEach((data) => {
        switch (data.category) {
          case 'fashion':
            fashion++;
            fashionPrice += data.price;
            break;
          case 'cosmetic':
            cosmetic++;
            cosmeticPrice += data.price;
            break;
          case 'digital':
            digital++;
            digitalPrice += data.price;
            break;
          case 'interior':
            interior++;
            interiorPrice += data.price;
            break;
          case 'kid':
            kid++;
            kidPrice += data.price;
            break;
          case 'food':
            food++;
            foodPrice += data.price;
            break;
          case 'sports':
            sports++;
            sportsPrice += data.price;
            break;
          case 'life':
            life++;
            lifePrice += data.price;
            break;
          case 'culture':
            culture++;
            culturePrice += data.price;
            break;
          default:
            break;
        }
      });
      return res.status(200).json({
        success: true,
        fashion: { percent: Math.round(fashion / total * 100), price: fashionPrice },
        care: { percent: Math.round(cosmetic / total * 100), price: cosmeticPrice },
        digit: { percent: Math.round(digital / total * 100), price: digitalPrice },
        interior: { percent: Math.round(interior / total * 100), price: interiorPrice },
        kid: { percent: Math.round(kid / total * 100), price: kidPrice },
        food: { percent: Math.round(food / total * 100), price: foodPrice },
        sports: { percent: Math.round(sports / total * 100), price: sportsPrice },
        life: { percent: Math.round(life / total * 100), price: lifePrice },
        culture: { percent: Math.round(culture / total * 100), price: culturePrice },
      });
    }
    return res.status(501).json({ success: false, message: '결과없음' });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function getByCategory(req, res) {
  const { email } = req.decoded;
  const month = moment().format('M');
  const { category } = req.query;
  try {
    let list = await models.User.findOne({
      where: {
        email,
      },
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.and((models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), month)),
          ({ category })),
        required: true,
      }],
    });
    if (list) {
      console.log(list);
      list = list.purchase_lists;
      let totalPrice = 0;
      list.forEach((data) => {
        totalPrice += data.price;
      });
      return res.status(200).json({
        success: true, category, price: totalPrice, category_list: list,
      });
    }
    return res.status(501).json({ success: false, message: '결과없음' });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function compareByBudget(req, res) {
  const { email } = req.decoded;
  const month = moment().format('M');
  try {
    let monthlyPrice = 0;
    const userInfo = await models.User.findOne({
      where: { email },
    });
    const { budget } = userInfo;
    let list = await models.User.findOne({
      include: [{
        model: models.Purchase_list,
        where: models.sequelize.where(models.sequelize.fn('MONTH', models.sequelize.col('purchase_date')), parseInt(month)),
        required: true,
      }],
    });
    if (list) {
      list = list.purchase_lists;
      list.forEach((data) => {
        monthlyPrice += data.price;
      });
    }
    if (monthlyPrice >= budget) {
      return res.status(200).json({
        success: true, over: true, month_price: monthlyPrice, budget, diff_price: monthlyPrice - budget,
      });
    }
    const diff = budget - monthlyPrice;
    const remainDay = (moment().endOf('month').format('D')) - (moment().format('D'));
    const daySpend = Math.floor(diff / remainDay);
    return res.status(200).json({
      success: true, over: false, month_price: monthlyPrice, budget, diff_price: diff, rest_day: remainDay, rest_price: daySpend,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: 'Sever Error' });
  }
}

async function inputPurchase(req, res) {
  const { email } = req.decoded;
  const { name } = req.body;
  const { price } = req.body;
  const { date } = req.body;
  let food_category = null;
  try {
    const options = {
      method: 'POST',
      uri: 'http://ec2-13-124-76-148.ap-northeast-2.compute.amazonaws.com:8000/categorize/',
      body: {
        content: name,
      },
      json: true, // Automatically stringifies the body to JSON
    };
    const nlpResult = await rp(options);
    const { category } = nlpResult;
    if (category === 'food') {
      const options2 = {
        method: 'POST',
        uri: 'http://ec2-13-124-76-148.ap-northeast-2.compute.amazonaws.com:8000/food_categorize/',
        body: {
          content: name,
        },
        json: true, // Automatically stringifies the body to JSON
      };
      const nlpResult2 = await rp(options2);
      food_category = nlpResult2.category;
    }
    await models.Purchase_list.create({
      email,
      item_name: name,
      price,
      category,
      food_category,
      purchase_date: date,
    });
    return res.status(200).json({
      success: true, email, item_name: name, price, category, food_category,
    });
  } catch (e) {
    console.log(e);
    return res.status(200).json({ success: false });
  }
}

async function getExcel(req, res) {

}

module.exports = {
  getByMonth,
  getByDay,
  comparePrevMonth,
  percentByCategory,
  getByCategory,
  compareByBudget,
  inputPurchase,
  getExcel,
};
