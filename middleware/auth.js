require('dotenv').config();
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers['x-access-token'] || req.query.token;
  console.log(token);
  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'not logged in',
    });
  }

  const decoded = jwt.verify(token, process.env.jwt_secret);
  if (decoded) {
    console.log('토큰 검증 성공');
    req.decoded = decoded;
    next();
  } else {
    return res.status(500).json({
      success: false,
      message: 'token error',
    });
  }
};

module.exports = authMiddleware;
