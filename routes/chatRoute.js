const express = require("express");
const Message = require("../models/Message");
const { protectRoute } = require("../middlewares/protectRoute");
const Group = require("../models/Group");
const User = require("../models/User");

const router = express.Router();

router.get("/conversations", protectRoute, async (req, res) => {
  try {
    const users = await User.find();
    const groups = await Group.find().populate("members");

    res.json({ success: true, users, groups });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/messages", protectRoute, async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender", "username")
      .populate("receiver", "username")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server Error" });
  }
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
    })
      .populate("sender", "username")
      .populate("receiver", "username")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/group/:groupId", protectRoute, async (req, res) => {
  const { groupId } = req.params;

  try {
    const messages = await Message.find({ group: groupId })
      .populate("sender", "username")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/", protectRoute, async (req, res) => {
  const { content, receiver, group } = req.body;

  try {
    const message = await Message.create({
      sender: req.user.id,
      content,
      receiver,
      group,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message" });
  }
});

router.patch("/join-group/:groupId", protectRoute, async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  try {
    const group = await Group.findByIdAndUpdate(
      groupId,
      {
        $addToSet: { members: userId },
      },
      { new: true }
    ).populate("members", "username");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error adding user to group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/create-group", protectRoute, async (req, res) => {
  const { name, members } = req.body;

  if (!name || !members || !members.length) {
    return res
      .status(400)
      .json({ message: "Group name and members are required" });
  }

  try {
    const newGroup = await Group.create({
      name,
      members,
    });

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
