const express = require('express')
const { getTestMessage } = require('../controllers/testController')

const router = express.Router()

router.get('/test', getTestMessage)

module.exports = router
