const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const authRoutes = require("./routes/authRoute.js");
const chatRoutes = require("./routes/chatRoute.js");
const { connectDB } = require("./config/db");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();

const morgan = require("morgan");
const User = require("./models/User.js");
const Message = require("./models/Message.js");
const Group = require("./models/Group.js");

app.use(morgan("dev"));

dotenv.config();

app.use(cookieParser());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

app.use(express.json());
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

const activeUsers = new Map();

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
    const recipientSocketId = activeUsers.get(receiver);
    const newMessage = new Message({
      sender: userId,
      receiver,
      content,
    });

    await newMessage.save();
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("privateMessage", newMessage.toJSON());
    }
  });

  socket.on("typing", ({ recipientId, senderId }) => {
    const recipientSocketId = activeUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("userTyping", senderId);
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
    console.log(`User joined group: ${groupId}`);
  });

  socket.on("sendGroupMessage", async ({ groupId, content }) => {
    const newMessage = {
      sender: userId,
      content,
      createdAt: new Date(),
    };

    const group = await Group.findByIdAndUpdate(groupId, {
      $push: { messages: newMessage },
    });

    io.to(groupId).emit("groupMessage", newMessage);
  });

  socket.on("disconnect", () => {
    const userId = Array.from(activeUsers.entries()).find(
      ([_, socketId]) => socketId === socket.id
    )?.[0];

    if (userId) {
      console.log(`User Disconnected: ${userId}`); // Fixed here
      activeUsers.delete(userId);
      io.emit("activeUsers", Array.from(activeUsers.keys()));
    }
  });
});

server.listen(5000, async () => {
  await connectDB();
  console.log("🚀 Server running on port 5000");
});
