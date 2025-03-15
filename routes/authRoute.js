const express = require("express");
const User = require("../models/User");
const { generateToken } = require("../utils/generateToken");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({
        success: false,
        msg: "user with username: " + username + " already exists",
      });
    }
    const user = await User.create({ username, password });
    res.status(201).json({ success: false, msg: "user created" });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error registering user");
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    user.online = true;
    await user.save();

    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.__v;
    delete userObject.createdAt;
    delete userObject.updatedAt;
    return res.status(200).json({ success: true, data: userObject });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error while loggin in");
  }
});

router.get("/logout", async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "User logged out successfully" });
});

module.exports = router;
