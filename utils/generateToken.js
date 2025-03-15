const jwt = require("jsonwebtoken");

const generateToken = (username, userId) => {
  return jwt.sign({ username, id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

module.exports = { generateToken };
