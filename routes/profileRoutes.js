
const express = require('express');
const router = express.Router();
const profleController = require('../controllers/profleController');


router.get('/profile', profleController.getProfile);
module.exports = router;