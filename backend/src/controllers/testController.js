const { buildTestResponse } = require('../services/testService')

function getTestMessage(req, res) {
  res.status(200).json(buildTestResponse())
}

module.exports = {
  getTestMessage,
}
