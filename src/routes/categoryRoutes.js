const express = require('express');
const router = express.Router();
const db = require('../../db');
const {StatusCodes} = require('http-status-codes');
const auth = require('../utils/authMiddleware');

router.get('/', auth(), async (req, res) => {
  try {
    const categories = await db('categories').select('*');
    res.status(StatusCodes.OK).json(categories);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }});

module.exports = router;  