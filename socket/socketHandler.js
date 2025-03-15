const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");

const handleSocketConnection = async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) return next(new Error("Unauthorized"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return next(new Error("User not found"));

    socket.user = user;

    user.online = true;
    await user.save();

    socket.on("sendMessage", async (data) => {
      const message = await Message.create({
        sender: user._id,
        content: data.content,
      });

      socket.broadcast.emit("receiveMessage", message);
    });

    socket.on("disconnect", async () => {
      user.online = false;
      user.lastSeen = new Date();
      await user.save();
    });

    next();
  } catch (err) {
    next(new Error("Invalid Token"));
  }
};

module.exports = { handleSocketConnection };
