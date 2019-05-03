require('dotenv').config()
const models = require('../models');


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

function getByMonth (req,res) {
  const email = req.body.email;
  models.User.findAll({
    include: [{
      model: models.Purchase_list,
      as: 'lists',
      where: (models.sequelize.fn('MONTH', models.sequelize.col('pruchase_date')), 5}),
      required: false
    }],
  }).then(list => {
      console.log(list);
      if (list){
          return res.status(200).json({result: list});
      } else {
          // Return when no data found
          return res.status(403).json({success: false});
      }
  }).catch(function (err){
    return res.status(500).json({success: false});
  });
}

module.exports = {
    login: login,
    verifyToken: verifyToken,
    getByMonth: getByMonth
}
