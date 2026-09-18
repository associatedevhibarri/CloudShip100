const catchAsync = require('../utils/catchAsync');
const weatherService = require('../services/weather.service');

const getWeather = catchAsync(async (req, res) => {
  const rows = await weatherService.getWeatherAnalytics();
  res.send(rows);
});

module.exports = {
  getWeather,
};
