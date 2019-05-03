const Sequelize = require('sequelize');
require('dotenv').config()

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PW, {
        logging: console.log,
        host: process.env.DB_HOST,
        dialect: 'mysql',
        timezone: '+09:00',
        define: {
            // For Korean support
            charset: 'utf8',
            collate: 'utf8_general_ci',

            // don't add the timestamp attributes (updatedAt, createdAt)
            timestamps: false,

            // don't delete database entries but set the newly added attribute deletedAt
            // to the current date (when deletion was done). paranoid will only work if
            // timestamps are enabled
            paranoid: false,

            // don't use camelcase for automatically added attributes but underscore style
            // so updatedAt will be updated_at
            underscored: true,

            // disable the modification of tablenames; By default, sequelize will automatically
            // transform all passed model names (first parameter of define) into plural.
            // if you don't want that, set the following
            freezeTableName: false,
        }

    }

);


const User = sequelize.define('user', {
  email: { type: Sequelize.STRING, primaryKey: true},
  password: Sequelize.STRING,
  name: Sequelize.STRING,
  naver_id: Sequelize.STRING,
  naver_pw: Sequelize.STRING,
  budget: Sequelize.INTEGER,
});

const Purchase_list = sequelize.define('purchase_list', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
  email: { type: Sequelize.STRING, allowNull: false, references: {model: User, key: 'email'}},
  item_name: Sequelize.STRING,
  price: Sequelize.INTEGER,
  purchase_date: Sequelize.DATE,
});

User.hasMany(Purchase_list, {foreignKey: 'email'});


module.exports = {
    sequelize: sequelize,
    User: User,
    Purchase_list: Purchase_list,
};
