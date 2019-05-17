require('dotenv').config();
const moment = require('moment');
const rp = require('request-promise');
const schedule = require('node-schedule');
const cheerio = require('cheerio');
const {
  Builder, By,
} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const models = require('../models');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


const scheduler = async () => {
  console.log('스케쥴러 시작');
  await sleep(1000);
  const driver = new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options().addArguments('--headless').addArguments('--no-sandbox').addArguments('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36')).build();
  const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  };
  const userInfo = await models.User.findAll({
  });
  await driver.executeScript("Object.defineProperty(navigator, 'languages', {get: function() {return ['ko-KR', 'ko']}})");
  await asyncForEach(userInfo, async (user, idx) => {
    try {
      const purchaseList = [];
      let category = null;
      let food_category = null;
      let name = null;
      for (let i = 0; i < 51; i += 5) {
        await driver.get(`https://my.coupang.com/purchase/list?year=2019&startIndex=${i}&orderTab=ALL_ORDER`);
        if (i === 0) {
          await driver.findElement(By.id('login-email-input')).sendKeys(user.coupang_id);
          await sleep(500);
          await driver.findElement(By.id('login-password-input')).sendKeys(user.coupang_pw);
          await driver.findElement(By.className('login__button')).click();
          await sleep(500);
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
              date = String(date.replace(/\//g, '-'));
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
              // moment().subtract(1, 'days').format('YYYY-M-D')
              console.log(name);
              console.log(date);
              if (date === String(moment().subtract(1, 'days').format('YYYY/M/D').replace(/\//g, '-'))) {
                purchaseList.push({
                  name, category, food_category, date, price,
                });
              }
            });
          }
        });
        await sleep(1000);
      }
      await driver.get('https://login.coupang.com/login/logout.pang?rtnUrl=https%3A%2F%2Fwww.coupang.com%2Fnp%2Fpost%2Flogout%3Fr%3Dhttps%253A%252F%252Fmy.coupang.com%252Fpurchase%252Flist%253Fyear%253D2019%2526startIndex%253D5%2526orderTab%253DALL_ORDER');
      await asyncForEach(purchaseList, async (data, idx2) => {
        const options = {
          method: 'POST',
          uri: 'http://ec2-13-124-76-148.ap-northeast-2.compute.amazonaws.com:8000/categorize/',
          body: {
            content: data.name,
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
              content: data.name,
            },
            json: true, // Automatically stringifies the body to JSON
          };
          const nlpResult2 = await rp(options2);
          food_category = nlpResult2.category;
          data.food_category = food_category;
        }
      });
      await sleep(1000);
      console.log(purchaseList);
      if (purchaseList) {
        await asyncForEach(purchaseList, async (item_data, item_idx) => {
          await models.Purchase_list.create({
            email: user.email,
            item_name: item_data.name,
            category: item_data.category,
            food_category: item_data.food_category,
            price: item_data.price,
            purchase_date: new Date(item_data.date),
          });
        });
        // return { success: true, list: purchaseList };
      }
      // return { success: false, message: '결과없음' };
      if (idx === userInfo.length - 1) await driver.quit();
    } catch (err) {
      console.log(err);
      // return { success: false };
    } finally {
      console.log('finish');
      await sleep(1000);
      // await driver.quit();
    }
  });
};

module.exports = scheduler;
