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
            freezeTableName: true,
        }

    }

);


const User = sequelize.define('user', {
  email: { type: Sequelize.STRING(30), allowNull: false, primaryKey: true},
  password: { type: Sequelize.STRING(50), allowNull: false},
  name: { type: Sequelize.STRING(10), allowNull: false},
  phone: { type: Sequelize.STRING(20), allowNull: false},
  coupang_id: { type: Sequelize.STRING(30), allowNull: false},
  coupang_pw: { type: Sequelize.STRING(20), allowNull: false},
  budget: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0},
});

const Purchase_list = sequelize.define('purchase_list', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
  email: { type: Sequelize.STRING(30), allowNull: false, references: {model: User, key: 'email'}},
  item_name: { type: Sequelize.STRING(100), allowNull: false},
  price: { type: Sequelize.INTEGER, allowNull: false},
  category: { type: Sequelize.STRING(20), allowNull: false},
  food_category: { type: Sequelize.STRING(20) },
  purchase_date: Sequelize.DATEONLY,
});

const Excel = sequelize.define('excel', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
  email: { type: Sequelize.STRING(30), allowNull: false, references: {model: User, key: 'email'}},
  url: { type: Sequelize.STRING(100), allowNull: false},
  date: Sequelize.DATEONLY,
});

const Feedback = sequelize.define('feedback', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
  email: { type: Sequelize.STRING(30), allowNull: false, references: {model: User, key: 'email'}},
  name: { type: Sequelize.STRING(10), allowNull: false},
  content: { type: Sequelize.TEXT, allowNull: false},
  date: Sequelize.DATEONLY,
});

const Alarm = sequelize.define('alarm', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
  email: { type: Sequelize.STRING(30), allowNull: false, references: {model: User, key: 'email'}},
  food_category: { type: Sequelize.STRING(20), allowNull: false},
  date: Sequelize.DATEONLY,
});

const Admin = sequelize.define('admin', {
  email: { type: Sequelize.STRING(30), allowNull: false, primaryKey: true},
  password: { type: Sequelize.STRING(50), allowNull: false},
  name: { type: Sequelize.STRING(10), allowNull: false},
  phone: { type: Sequelize.STRING(20), allowNull: false},
});

User.hasMany(Purchase_list, {foreignKey: 'email'});
User.hasMany(Excel, {foreignKey: 'email'});
User.hasMany(Feedback, {foreignKey: 'email'});
User.hasMany(Alarm, {foreignKey: 'email'});


module.exports = {
    sequelize: sequelize,
    User: User,
    Purchase_list: Purchase_list,
    Excel: Excel,
    Feedback: Feedback,
    Alarm: Alarm,
    Admin: Admin,
};
