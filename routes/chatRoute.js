const express = require("express");
const Message = require("../models/Message");
const { protectRoute } = require("../middlewares/protectRoute");
const Group = require("../models/Group");
const User = require("../models/User");

const router = express.Router();

router.get("/conversations", protectRoute, async (req, res) => {
  try {
    const users = await User.find();
    const groups = await Group.find({
      members: { $in: [req.user.id] },
    }).populate("members");

    res.json({ success: true, users, groups });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/messages", protectRoute, async (req, res) => {
  const messages = await Message.find()
    .populate("sender", "username")
    .sort({ createdAt: 1 });
  res.json(messages);
});

router.get("/:recipientId", protectRoute, async (req, res) => {
  const { recipientId } = req.params;
  const userId = req.user.id;

  try {
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: recipientId },
        { sender: recipientId, receiver: userId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching messages" });
  }
});

router.get("/group/:groupId", protectRoute, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: recipientId },
        { sender: recipientId, receiver: userId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching messages" });
  }
});

router.post("/create-group", protectRoute, async (req, res) => {
  const { name, members } = req.body;
  const group = new Group({
    name,
    members,
  });

  await group.save();

  res.status(201).json(group);
});

module.exports = router;
