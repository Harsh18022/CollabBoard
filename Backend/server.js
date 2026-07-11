const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server and wrap Express app
const server = http.createServer(app);

// Attach Socket.io to the server
const io = new Server(server, {
  cors: { origin: "*" },
});

// Make io accessible in routes via req.app.get("io")
app.set("io", io);

// Socket connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinBoard", (boardId) => {
    socket.join(boardId);
    console.log(`Socket ${socket.id} joined board ${boardId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const authRoutes = require("./routes/auth");
const boardRoutes = require("./routes/boards");
const taskRoutes = require("./routes/tasks");
const protect = require("./middleware/auth");

app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/tasks", taskRoutes);

app.get("/api/protected-test", protect, (req, res) => {
  res.json({ message: "You are authenticated!", userId: req.userId });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));