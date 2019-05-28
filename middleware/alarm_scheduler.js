require('dotenv').config();
const moment = require('moment');
const models = require('../models');
const mailer = require('./mail');

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
      include: [{
        model: models.Purchase_list,
        required: true,
      }],
    });
    const purchase_list = userInfo.purchase_lists;
    const bodyString = `${userInfo.name} 님! ${data.food_category}를(을) 사야 할 날짜에요!\n\n최근에 구매하신 ${data.food_category}를(을) 보여드릴게요!\n\n`;
    let itemString = '';
    purchase_list.forEach((purchase_data, purchase_idx) => {
      if (purchase_idx < 5) {
        itemString += `${purchase_data.item_name}\n`;
      }
    });
    await mailer(data.email, `${userInfo.name} 님! ${data.food_category}를(을) 사야 할 날짜에요!`, bodyString + itemString);
  });
};

module.exports = alarm_scheduler;
