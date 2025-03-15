const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const authRoutes = require("./routes/authRoute.js");
const chatRoutes = require("./routes/chatRoute.js");
const { connectDB } = require("./config/db");
const { handleSocketConnection } = require("./socket/socketHandler");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();

const morgan = require("morgan");
const User = require("./models/User.js");
const Message = require("./models/Message.js");

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

  const username = decoded.username;
  activeUsers.set(username, socket.id);
  console.log(`User Connected: ${username}`);

  io.emit("activeUsers", Array.from(activeUsers.keys()));

  socket.on("privateMessage", ({ recipientId, message }) => {
    const recipientSocketId = activeUsers.get(recipientId);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("privateMessage", {
        sender: username,
        message,
      });
    }
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

  socket.on("typing", (userId) => {
    socket.broadcast.emit("userTyping", userId);
  });

  socket.on("message", (data) => {
    const messagePayload = {
      sender: data.sender,
      message: data.message,
    };

    io.emit("message", messagePayload);
  });
});

server.listen(5000, async () => {
  await connectDB();
  console.log("🚀 Server running on port 5000");
});
