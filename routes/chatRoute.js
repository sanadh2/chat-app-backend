const express = require("express");
const Message = require("../models/Message");

const router = express.Router();

router.get("/messages", async (req, res) => {
  const messages = await Message.find().sort({ timestamp: 1 });
  res.json(messages);
});

module.exports = router;
