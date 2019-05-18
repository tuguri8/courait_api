require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const {
  Builder, By,
} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const cheerio = require('cheerio');
const models = require('../models');
const mailer = require('../middleware/mail');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function login(req, res) {
  models.User.findOne({
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
      console.log(token);
      return res.status(200).json({
        success: true,
        token,
      });
    }
    return res.status(500).json({
      success: false,
      message: '이메일 혹은 비밀번호가 틀렸습니다.',
    });
  }).catch((err) => {
    console.log(err);
    res.status(500).json({
      success: false,
      message: '이메일 혹은 비밀번호가 틀렸습니다.',
    });
  });
}

async function register(req, res) {
  // const driver = new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options().addArguments('--headless')).build();
  const { email } = req.body;
  const { password } = req.body;
  const { name } = req.body;
  const { phone } = req.body;
  const { coupang_id } = req.body;
  const { coupang_pw } = req.body;
  if (email === '' || password === '' || name === '' || phone === '' || coupang_id === '' || coupang_pw === '') {
    return res.status(502).json({ success: false, message: '양식을 다 입력하세요!' });
  }
  try {
    const cipher = crypto.createCipher('aes192', process.env.crypto_secret);
    cipher.update(`${password}`, 'utf8', 'base64');
    const cipheredPassword = cipher.final('base64');
    const cipher2 = crypto.createCipher('aes192', process.env.crypto_secret);
    cipher2.update(`${coupang_pw}`, 'utf8', 'base64');
    const cipheredCoupangPassword = cipher2.final('base64');
    const userInfo = await models.User.findOne({
      where: {
        email: req.body.email,
      },
    });
    if (userInfo) {
      return res.status(501).json({ success: false, message: '중복된 ID입니다' });
    }
    // await driver.get('https://my.coupang.com/purchase/list?year=2019&startIndex=1&orderTab=ALL_ORDER');
    // await driver.findElement(By.id('login-email-input')).sendKeys(userInfo.coupang_id);
    // await sleep(1000);
    // await driver.findElement(By.id('login-password-input')).sendKeys(userInfo.coupang_pw);
    // await driver.findElement(By.className('login__button')).click();
    // await sleep(1000);
    // driver.getPageSource().then((title) => {
    //   const $ = cheerio.load(title);
    //   if ($('#listContainer > div.my-purchase-list__no-result.my-color--gray.my-font--14').text().includes('없습니다')) {
    //
    //   } else {
    //
    //   }
    // });
    await models.User.create({
      email,
      password: cipheredPassword,
      name,
      phone,
      coupang_id,
      coupang_pw: cipheredCoupangPassword,
    });
    await models.Alarm.bulkCreate([
      { email, food_category: 'fashion', date: null },
      { email, food_category: 'cosmetic', date: null },
      { email, food_category: 'digital', date: null },
      { email, food_category: 'interior', date: null },
      { email, food_category: 'kid', date: null },
      { email, food_category: 'food', date: null },
      { email, food_category: 'sports', date: null },
      { email, food_category: 'life', date: null },
      { email, food_category: 'culture', date: null },
    ]);
    return res.status(200).json({ success: true, message: '회원가입에 성공했습니다.' });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false, message: '회원가입에 실패했습니다.' });
  }
}

async function searchID(req, res) {
  const userInfo = await models.User.findOne({
    where: {
      name: req.body.name,
      phone: req.body.phone,
    },
  });
  if (userInfo) {
    res.status(200).json({
      success: true,
      message: `${userInfo.name}님의 아이디는 ${userInfo.email} 입니다.`,
    });
  } else {
    res.status(500).json({
      success: false,
      message: '이름 혹은 전화번호가 틀렸습니다.',
    });
  }
}

async function searchPW(req, res) {
  const userInfo = await models.User.findOne({
    where: {
      email: req.body.email,
      name: req.body.name,
      phone: req.body.phone,
    },
  });
  if (userInfo) {
    const decipher = crypto.createDecipher('aes192', process.env.crypto_secret);
    decipher.update(userInfo.password, 'base64', 'utf8');
    const decipheredPassword = decipher.final('utf8');
    try {
      await mailer(userInfo.email, `${userInfo.name} 님의 비밀번호 찾기 결과입니다`, decipheredPassword);
      res.status(200).json({
        success: true,
        message: `${req.body.name}님의 비밀번호가 이메일로 전송되었습니다.`,
      });
    } catch (e) {
      console.log(e);
      res.status(501).json({
        success: false,
        message: 'Mail Server Error',
      });
    }
  } else {
    res.status(500).json({
      success: false,
      message: '입력하신 정보가 틀렸습니다.',
    });
  }
}

module.exports = {
  login,
  register,
  searchID,
  searchPW,
};
