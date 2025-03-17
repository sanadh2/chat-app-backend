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
const { handleSocketConnection } = require("./socket/socketHandler.js");
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

handleSocketConnection(io);

server.listen(5000, async () => {
  await connectDB();
  console.log("🚀 Server running on port 5000");
});
