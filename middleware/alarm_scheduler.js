require('dotenv').config();
const moment = require('moment');
const models = require('../models');
const mailer = require('./mail');

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

const alarm_scheduler = async () => {
  const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  };
  const list = await models.Alarm.findAll({
    where: {
      date: moment().format('YYYY-MM-DD'),
    },
  });
  await asyncForEach(list, async (data, idx) => {
    const userInfo = await models.User.findOne({
      where: {
        email: data.email,
      },
    });
    const purchase_list = await models.Purchase_list.findAll({
      where: {
        email: userInfo.email,
        food_category: data.food_category,
        order: [
          ['id', 'DESC'],
        ],
      },
    });
    const userCategory = getFoodCategory(data.food_category);
    const bodyString = `${userInfo.name} 님! ${userCategory}를(을) 구매할 날짜에요!\n\n최근에 구매하신 ${userCategory}를(을) 보여드릴게요!\n\n`;
    let itemString = '';
    purchase_list.forEach((purchase_data, purchase_idx) => {
      if (purchase_idx < 5) {
        itemString += `${purchase_data.item_name}\n`;
      }
    });
    await mailer(data.email, `${userInfo.name} 님! ${userCategory}를(을) 구매할 날짜에요!`, bodyString + itemString);
  });
};

module.exports = alarm_scheduler;
