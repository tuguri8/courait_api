require('dotenv').config();
const crypto = require('crypto');
const moment = require('moment');
const rp = require('request-promise');
const {
  Builder, By,
} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const cheerio = require('cheerio');
const _ = require('underscore');
const xl = require('excel4node');
const AWS = require('aws-sdk');
const models = require('../models');
const mailer = require('../middleware/mail');

AWS.config.loadFromPath('./awscreds.json');

function getCategory(category) {
  switch (category) {
    case 'fashion':
      return '패션';
    case 'cosmetic':
      return '화장품/미용';
    case 'digital':
      return '디지털/가전';
    case 'interior':
      return '가구/인테리어';
    case 'kid':
      return '출산/육아';
    case 'food':
      return '식품';
    case 'sports':
      return '스포츠/레저';
    case 'life':
      return '생활/건강';
    case 'culture':
      return '여행/문화';
    default:
      break;
  }
}

function getFoodCategory(category) {
  switch (category) {
    case 'meat':
      return '축산';
    case 'fish':
      return '수산';
    case 'agriculture':
      return '농산물';
    case 'banchan':
      return '반찬';
    case 'kimchi':
      return '김치';
    case 'snack':
      return '과자';
    case 'beverage':
      return '음료';
    case 'icecream':
      return '아이스크림';
    case 'frozen':
      return '냉동/간편조리식품';
    case 'gagong':
      return '가공식품';
    case 'health':
      return '건강식품';
    default:
      return '-';
  }
}

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
          const decipher = crypto.createDecipher('aes192', process.env.crypto_secret);
          decipher.update(userInfo.coupang_pw, 'base64', 'utf8');
          const decipheredPassword = decipher.final('utf8');
          await driver.findElement(By.id('login-email-input')).sendKeys(userInfo.coupang_id);
          await sleep(1000);
          await driver.findElement(By.id('login-password-input')).sendKeys(decipheredPassword);
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
          uri: `${process.env.nlp_url}/categorize/`,
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
            uri: `${process.env.nlp_url}/food_categorize/`,
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
        where: {
          email,
        },
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
      where: {
        email,
      },
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
      let dataArr = [{
        name: 'fashion',
        percent: Math.round(fashion / total * 100),
        price: fashionPrice,
      }, {
        name: 'cosmetic',
        percent: Math.round(cosmetic / total * 100),
        price: cosmeticPrice,
      }, {
        name: 'digital',
        percent: Math.round(digital / total * 100),
        price: digitalPrice,
      }, {
        name: 'interior',
        percent: Math.round(interior / total * 100),
        price: interiorPrice,
      }, {
        name: 'kid',
        percent: Math.round(kid / total * 100),
        price: kidPrice,
      }, {
        name: 'food',
        percent: Math.round(food / total * 100),
        price: foodPrice,
      }, {
        name: 'sports',
        percent: Math.round(sports / total * 100),
        price: sportsPrice,
      }, {
        name: 'life',
        percent: Math.round(life / total * 100),
        price: lifePrice,
      }, {
        name: 'culture',
        percent: Math.round(culture / total * 100),
        price: culturePrice,
      }];
      dataArr = _.sortBy(dataArr, 'percent').reverse();
      dataArr.forEach((data2, idx) => {
        if (data2.percent === 0) {
          data2.rank = 9;
        } else {
          data2.rank = idx + 1;
        }
      });
      const result = { success: true };
      dataArr.forEach((data3) => {
        result[data3.name] = {
          rank: data3.rank,
          percent: data3.percent,
          price: data3.price,
        };
      });
      return res.status(200).json(result);
      // return res.status(200).json({
      //   success: true,
      //   fashion: { percent: Math.round(fashion / total * 100), price: fashionPrice },
      //   cosmetic: { percent: Math.round(cosmetic / total * 100), price: cosmeticPrice },
      //   digital: { percent: Math.round(digital / total * 100), price: digitalPrice },
      //   interior: { percent: Math.round(interior / total * 100), price: interiorPrice },
      //   kid: { percent: Math.round(kid / total * 100), price: kidPrice },
      //   food: { percent: Math.round(food / total * 100), price: foodPrice },
      //   sports: { percent: Math.round(sports / total * 100), price: sportsPrice },
      //   life: { percent: Math.round(life / total * 100), price: lifePrice },
      //   culture: { percent: Math.round(culture / total * 100), price: culturePrice },
      // });
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
      list = _.sortBy(list, 'purchase_date');
      list = _.groupBy(list, 'purchase_date');
      const newList = {};
      for (let i = 0; i < Object.keys(list).length; i++) {
        newList[moment(Object.keys(list)[i]).format('D')] = list[Object.keys(list)[i]];
      }
      return res.status(200).json({
        success: true, category, price: totalPrice, category_list: list, category_list_mobile: newList,
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
      where: { email },
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
      uri: `${process.env.nlp_url}/categorize/`,
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
        uri: `${process.env.nlp_url}/food_categorize/`,
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
    if (category === 'food') {
      const list = await models.Purchase_list.findAll({
        where: {
          email,
          food_category,
        },
      });
      const diffArr = [];
      let diffDate;
      if (list.length > 1) {
        list.forEach((data, idx) => {
          if (idx < list.length - 1) {
            diffArr.push(moment(list[idx + 1].purchase_date).diff(moment(data.purchase_date), 'days'));
          }
        });
        const dateSum = diffArr.reduce((acc, cur) => acc + cur);
        diffDate = Math.round(dateSum / diffArr.length);
        if (diffDate === 0) diffDate = 1;
        await models.Alarm.update(
          {
            // date: moment().add(diffDate, 'd').format('YYYY-MM-DD'),
            date: '2019-05-28',
          },
          {
            where: {
              email,
              food_category,
            },
          },
        );
      }
    }
    return res.status(200).json({
      success: true, email, item_name: name, price, category, food_category,
    });
  } catch (e) {
    console.log(e);
    return res.status(200).json({ success: false });
  }
}

async function getExcel(req, res) {
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
      const userName = list.name;
      list = list.purchase_lists;
      list.forEach((data) => {
        data.category = getCategory(data.category);
        data.food_category = getFoodCategory(data.food_category);
      });
      const s3 = new AWS.S3();
      const wb1 = new xl.Workbook();
      const ws = wb1.addWorksheet('sheet1');
      const myStyle = wb1.createStyle({
        font: {
          bold: true,
          underline: true,
          size: 18,
        },
        alignment: {
          wrapText: true,
          horizontal: 'center',
        },
        border: {
          left: {
            style: 'thin',
            color: 'black',
          },
          right: {
            style: 'thin',
            color: 'black',
          },
          top: {
            style: 'thin',
            color: 'black',
          },
          bottom: {
            style: 'thin',
            color: 'black',
          },
          outline: false,
        },
      });

      const basicStyle = wb1.createStyle({
        font: {
          size: 16,
        },
        border: {
          left: {
            style: 'thin',
            color: 'black',
          },
          right: {
            style: 'thin',
            color: 'black',
          },
          top: {
            style: 'thin',
            color: 'black',
          },
          bottom: {
            style: 'thin',
            color: 'black',
          },
          outline: false,
        },
      });

      const currencyStyle = wb1.createStyle({
        font: {
          size: 16,
        },
        border: {
          left: {
            style: 'thin',
            color: 'black',
          },
          right: {
            style: 'thin',
            color: 'black',
          },
          top: {
            style: 'thin',
            color: 'black',
          },
          bottom: {
            style: 'thin',
            color: 'black',
          },
          outline: false,
        },
        numberFormat: '₩#,##0; (₩#,##0); -',
      });

      ws.cell(1, 1, 1, 5, true).string(`${userName}님의 ${month}월 지출내역`).style(myStyle);
      ws.column(1).setWidth(15);
      ws.column(2).setWidth(50);
      ws.column(3).setWidth(15);
      ws.column(4).setWidth(19);
      ws.column(5).setWidth(19);
      ws.column(7).setWidth(15);
      ws.column(8).setWidth(15);
      ws.cell(2, 1).string('구매날짜').style(basicStyle);
      ws.cell(2, 2).string('상품명').style(basicStyle);
      ws.cell(2, 3).string('가격').style(basicStyle);
      ws.cell(2, 4).string('분류').style(basicStyle);
      ws.cell(2, 5).string('식품 상세 분류').style(basicStyle);
      ws.cell(1, 7, 1, 8, true).string('분류별/총 금액').style(myStyle);
      ws.cell(2, 7).string('분류').style(basicStyle);
      ws.cell(2, 8).string('금액').style(basicStyle);
      ws.cell(3, 7).string('패션').style(basicStyle);
      ws.cell(3, 8).formula('SUMIF(D3:D999,G3,C3:C999)').style(currencyStyle);
      ws.cell(4, 7).string('화장품/미용').style(basicStyle);
      ws.cell(4, 8).formula('SUMIF(D3:D999,G4,C3:C999)').style(currencyStyle);
      ws.cell(5, 7).string('디지털/가전').style(basicStyle);
      ws.cell(5, 8).formula('SUMIF(D3:D999,G5,C3:C999)').style(currencyStyle);
      ws.cell(6, 7).string('가구/인테리어').style(basicStyle);
      ws.cell(6, 8).formula('SUMIF(D3:D999,G6,C3:C999)').style(currencyStyle);
      ws.cell(7, 7).string('출산/육아').style(basicStyle);
      ws.cell(7, 8).formula('SUMIF(D3:D999,G7,C3:C999)').style(currencyStyle);
      ws.cell(8, 7).string('식품').style(basicStyle);
      ws.cell(8, 8).formula('SUMIF(D3:D999,G8,C3:C999)').style(currencyStyle);
      ws.cell(9, 7).string('스포츠/레저').style(basicStyle);
      ws.cell(9, 8).formula('SUMIF(D3:D999,G9,C3:C999)').style(currencyStyle);
      ws.cell(10, 7).string('생활/건강').style(basicStyle);
      ws.cell(10, 8).formula('SUMIF(D3:D999,G10,C3:C999)').style(currencyStyle);
      ws.cell(11, 7).string('여행/문화').style(basicStyle);
      ws.cell(11, 8).formula('SUMIF(D3:D999,G11,C3:C999)').style(currencyStyle);
      ws.cell(12, 7).string('총 금액').style(basicStyle);
      ws.cell(12, 8).formula('SUM(C3:C999)').style(currencyStyle);
      list.forEach((data, idx) => {
        ws.cell(idx + 3, 1).string(data.purchase_date).style(basicStyle);
        ws.cell(idx + 3, 2).string(data.item_name).style(basicStyle);
        ws.cell(idx + 3, 3).number(data.price).style(currencyStyle);
        ws.cell(idx + 3, 4).string(data.category).style(basicStyle);
        ws.cell(idx + 3, 5).string(data.food_category).style(basicStyle);
      });

      function s3Upload(s3params) {
        return new Promise(((resolve, reject) => {
          s3.upload(s3params, (err, data) => {
            if (err) {
              reject(err.message);
            }
            console.log(data.Location);
            models.Excel.create({
              email,
              url: data.Location,
              date: moment().format('YYYY-MM-DD'),
            }).then(() => resolve(data.Location)).catch((inputErr) => {
              reject(inputErr);
            });
          });
        }));
      }

      const buffer = await wb1.writeToBuffer();
      const s3params = {
        Body: buffer,
        Bucket: 'courait',
        Key: `${email.split('@')[0]}${moment().format('x')}.xlsx`,
        ACL: 'public-read',
      };
      const url = await s3Upload(s3params);
      res.status(200).json({ success: true, url });
    } else {
      return res.status(501).json({ success: false, message: '결과없음' });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: '서버에러' });
  }
}

async function getExcelMobile(req, res) {
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
      const userName = list.name;
      list = list.purchase_lists;
      list.forEach((data) => {
        data.category = getCategory(data.category);
        data.food_category = getFoodCategory(data.food_category);
      });
      const s3 = new AWS.S3();
      const wb1 = new xl.Workbook();
      const ws = wb1.addWorksheet('sheet1');
      const myStyle = wb1.createStyle({
        font: {
          bold: true,
          underline: true,
          size: 18,
        },
        alignment: {
          wrapText: true,
          horizontal: 'center',
        },
        border: {
          left: {
            style: 'thin',
            color: 'black',
          },
          right: {
            style: 'thin',
            color: 'black',
          },
          top: {
            style: 'thin',
            color: 'black',
          },
          bottom: {
            style: 'thin',
            color: 'black',
          },
          outline: false,
        },
      });

      const basicStyle = wb1.createStyle({
        font: {
          size: 16,
        },
        border: {
          left: {
            style: 'thin',
            color: 'black',
          },
          right: {
            style: 'thin',
            color: 'black',
          },
          top: {
            style: 'thin',
            color: 'black',
          },
          bottom: {
            style: 'thin',
            color: 'black',
          },
          outline: false,
        },
      });

      const currencyStyle = wb1.createStyle({
        font: {
          size: 16,
        },
        border: {
          left: {
            style: 'thin',
            color: 'black',
          },
          right: {
            style: 'thin',
            color: 'black',
          },
          top: {
            style: 'thin',
            color: 'black',
          },
          bottom: {
            style: 'thin',
            color: 'black',
          },
          outline: false,
        },
        numberFormat: '₩#,##0; (₩#,##0); -',
      });

      ws.cell(1, 1, 1, 5, true).string(`${userName}님의 ${month}월 지출내역`).style(myStyle);
      ws.column(1).setWidth(15);
      ws.column(2).setWidth(50);
      ws.column(3).setWidth(15);
      ws.column(4).setWidth(19);
      ws.column(5).setWidth(19);
      ws.column(7).setWidth(15);
      ws.column(8).setWidth(15);
      ws.cell(2, 1).string('구매날짜').style(basicStyle);
      ws.cell(2, 2).string('상품명').style(basicStyle);
      ws.cell(2, 3).string('가격').style(basicStyle);
      ws.cell(2, 4).string('분류').style(basicStyle);
      ws.cell(2, 5).string('식품 상세 분류').style(basicStyle);
      ws.cell(1, 7, 1, 8, true).string('분류별/총 금액').style(myStyle);
      ws.cell(2, 7).string('분류').style(basicStyle);
      ws.cell(2, 8).string('금액').style(basicStyle);
      ws.cell(3, 7).string('패션').style(basicStyle);
      ws.cell(3, 8).formula('SUMIF(D3:D999,G3,C3:C999)').style(currencyStyle);
      ws.cell(4, 7).string('화장품/미용').style(basicStyle);
      ws.cell(4, 8).formula('SUMIF(D3:D999,G4,C3:C999)').style(currencyStyle);
      ws.cell(5, 7).string('디지털/가전').style(basicStyle);
      ws.cell(5, 8).formula('SUMIF(D3:D999,G5,C3:C999)').style(currencyStyle);
      ws.cell(6, 7).string('가구/인테리어').style(basicStyle);
      ws.cell(6, 8).formula('SUMIF(D3:D999,G6,C3:C999)').style(currencyStyle);
      ws.cell(7, 7).string('출산/육아').style(basicStyle);
      ws.cell(7, 8).formula('SUMIF(D3:D999,G7,C3:C999)').style(currencyStyle);
      ws.cell(8, 7).string('식품').style(basicStyle);
      ws.cell(8, 8).formula('SUMIF(D3:D999,G8,C3:C999)').style(currencyStyle);
      ws.cell(9, 7).string('스포츠/레저').style(basicStyle);
      ws.cell(9, 8).formula('SUMIF(D3:D999,G9,C3:C999)').style(currencyStyle);
      ws.cell(10, 7).string('생활/건강').style(basicStyle);
      ws.cell(10, 8).formula('SUMIF(D3:D999,G10,C3:C999)').style(currencyStyle);
      ws.cell(11, 7).string('여행/문화').style(basicStyle);
      ws.cell(11, 8).formula('SUMIF(D3:D999,G11,C3:C999)').style(currencyStyle);
      ws.cell(12, 7).string('총 금액').style(basicStyle);
      ws.cell(12, 8).formula('SUM(C3:C999)').style(currencyStyle);
      list.forEach((data, idx) => {
        ws.cell(idx + 3, 1).string(data.purchase_date).style(basicStyle);
        ws.cell(idx + 3, 2).string(data.item_name).style(basicStyle);
        ws.cell(idx + 3, 3).number(data.price).style(currencyStyle);
        ws.cell(idx + 3, 4).string(data.category).style(basicStyle);
        ws.cell(idx + 3, 5).string(data.food_category).style(basicStyle);
      });

      function s3Upload(s3params) {
        return new Promise(((resolve, reject) => {
          s3.upload(s3params, (err, data) => {
            if (err) {
              reject(err.message);
            }
            console.log(data.Location);
            models.Excel.create({
              email,
              url: data.Location,
              date: moment().format('YYYY-MM-DD'),
            }).then(() => resolve(data.Location)).catch((inputErr) => {
              reject(inputErr);
            });
          });
        }));
      }

      const buffer = await wb1.writeToBuffer();
      const s3params = {
        Body: buffer,
        Bucket: 'courait',
        Key: `${email.split('@')[0]}${moment().format('x')}.xlsx`,
        ACL: 'public-read',
      };
      const url = await s3Upload(s3params);
      await mailer(email, `${userName} 님의 ${month}월 지출내역 엑셀 파일 입니다`, url);
      res.status(200).json({ success: true });
    } else {
      return res.status(501).json({ success: false, message: '결과없음' });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: '서버에러' });
  }
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
  getExcelMobile,
};
