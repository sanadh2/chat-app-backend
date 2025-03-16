const express = require("express");
const User = require("../models/User");
const { generateToken } = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
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
    res.status(500).json({ success: false, msg: "Error registering user" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }
    const token = generateToken(user.username, user._id);

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
    res.status(500).json({ success: false, msg: "Error while loggin in" });
  }
});

router.get("/me", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ msg: "User not authenticated" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.__v;
    delete userObject.createdAt;
    delete userObject.updatedAt;
    return res.status(200).json({ success: true, user: userObject, token });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, msg: "Error while fetching user" });
  }
});

router.get("/logout", async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "User logged out successfully" });
});

module.exports = router;
