const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Group = require("../models/Group");

const activeUsers = new Map();

const handleSocketConnection = (io) => {
  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      console.log("Unauthorized socket connection");
      socket.disconnect();
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const username = decoded.username;
    activeUsers.set(userId, socket.id);
    console.log(`User Connected: ${username}`);

    io.emit("activeUsers", Array.from(activeUsers.keys()));

    socket.on("privateMessage", async ({ receiver, content }) => {
      console.log("priatemsg");
      const recipientSocketId = activeUsers.get(receiver._id);
      const newMessage = new Message({
        sender: userId,
        receiver: receiver._id,
        content,
      });

      await newMessage.save();
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("privateMessage", newMessage.toJSON());
      }
    });

    socket.on("typing", ({ recipientId, senderId, username }) => {
      const recipientSocketId = activeUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("userTyping", username);
      }
    });

    socket.on("message", (data) => {
      const messagePayload = {
        sender: data.sender,
        message: data.message,
      };

      io.emit("message", messagePayload);
    });

    socket.on("joinGroup", (groupId) => {
      socket.join(groupId);
    });

    socket.on("sendGroupMessage", async ({ group, content, sender }) => {
      const newMessage = await Message.create({
        sender: userId,
        group: group._id,
        content,
      });

      await Group.findByIdAndUpdate(group._id, {
        $push: { messages: newMessage._id },
      });
      io.to(group._id).emit("groupMessage", {
        sender,
        group: group,
        content,
        createdAt: newMessage.createdAt,
      });
    });

    socket.on("groupTyping", ({ groupId, senderId, username }) => {
      socket.to(groupId).emit("groupTyping", username);
    });

    socket.on("disconnect", () => {
      const userId = Array.from(activeUsers.entries()).find(
        ([_, socketId]) => socketId === socket.id
      )?.[0];

      if (userId) {
        console.log(`User Disconnected: ${userId}`);
        activeUsers.delete(userId);
        io.emit("activeUsers", Array.from(activeUsers.keys()));
      }
    });
  });
};

module.exports = { handleSocketConnection };
