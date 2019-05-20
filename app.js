const createError = require('http-errors');
const express = require('express');

const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const schedule = require('node-schedule');
const routes = require('./routes');
const scheduler = require('./middleware/scheduler');

schedule.scheduleJob('30 13 * * *', async () => {
  scheduler();
});
// CORS 설정
const corsOptions = {
  origin: ['http://localhost:3000', 'http://ec2-13-124-76-148.ap-northeast-2.compute.amazonaws.com:7002', 'http://192.9.44.53:65012', 'http://203.249.127.32:65012'],
  credentials: true,
};
app.use(cors(corsOptions));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/user', routes.user);
app.use('/auth', routes.auth);
app.use('/history', routes.history);
app.use('/admin', routes.admin);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
