const express = require("express");
const Message = require("../models/Message");
const { protectRoute } = require("../middlewares/protectRoute");

const router = express.Router();

router.get("/messages", protectRoute, async (req, res) => {
  const messages = await Message.find()
    .populate("sender", "username")
    .sort({ createdAt: 1 });
  res.json(messages);
});

module.exports = router;
