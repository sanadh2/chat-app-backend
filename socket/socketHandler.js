const Message = require("../models/Message");

const handleSocketConnection = (socket, io) => {
  console.log("🟢 User Connected:", socket.id);

  socket.on("sendMessage", async ({ sender, content }) => {
    const message = await Message.create({ sender, content });
    io.emit("receiveMessage", message); // Broadcast to all clients
  });

  socket.on("disconnect", async () => {
    console.log("🔴 User Disconnected:", socket.id);
  });
};

module.exports = { handleSocketConnection };
