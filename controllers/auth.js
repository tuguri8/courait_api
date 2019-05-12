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

async function register(req, res) {
  // const driver = new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options().addArguments('--headless')).build();
  try {
    const { email } = req.body;
    const { password } = req.body;
    const { name } = req.body;
    const { phone } = req.body;
    const { coupang_id } = req.body;
    const { coupang_pw } = req.body;
    const userInfo = await models.User.findOne({
      where: {
        email: req.body.email,
      },
    });
    if (userInfo) {
      return res.status(500).json({ success: false, message: '중복된 ID입니다' });
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
      password,
      name,
      phone,
      coupang_id,
      coupang_pw,
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
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
      email: userInfo.email,
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
      res.status(200).json({ success: true });
    } catch (e) {
      console.log(e);
      res.status(500).json({
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
