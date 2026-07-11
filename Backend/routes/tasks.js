const express = require("express");
const Task = require("../models/Task");
const Board = require("../models/Board");
const protect = require("../middleware/auth");
const { calculateLockStatus, hasCycle } = require("../utils/topoSort");

const router = express.Router();

async function hasAccess(boardId, userId) {
  const board = await Board.findById(boardId);
  if (!board) return false;
  return (
    board.owner.toString() === userId ||
    board.members.some((m) => m.toString() === userId)
  );
}

// CREATE task
router.post("/", protect, async (req, res) => {
  try {
    const { title, description, boardId, dependsOn } = req.body;

    const allowed = await hasAccess(boardId, req.userId);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const existingTasks = await Task.find({ boardId });
    const tempTask = { _id: "temp", dependsOn: dependsOn || [] };
    const allTasks = [...existingTasks, tempTask];

    if (dependsOn && dependsOn.length > 0 && hasCycle(allTasks)) {
      return res.status(400).json({ message: "Circular dependency detected. Cannot create task." });
    }

    const task = await Task.create({
      title,
      description,
      boardId,
      dependsOn: dependsOn || [],
    });

    const io = req.app.get("io");
    io.to(boardId.toString()).emit("taskUpdated");

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET all tasks for a board (with lock status)
router.get("/board/:boardId", protect, async (req, res) => {
  try {
    const allowed = await hasAccess(req.params.boardId, req.userId);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const tasks = await Task.find({ boardId: req.params.boardId });
    const tasksWithLockStatus = calculateLockStatus(tasks);
    res.json(tasksWithLockStatus);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// UPDATE task
router.put("/:id", protect, async (req, res) => {
  try {
    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) return res.status(404).json({ message: "Task not found" });

    const allowed = await hasAccess(existingTask.boardId, req.userId);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });

    const io = req.app.get("io");
    io.to(task.boardId.toString()).emit("taskUpdated");

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE task
router.delete("/:id", protect, async (req, res) => {
  try {
    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) return res.status(404).json({ message: "Task not found" });

    const allowed = await hasAccess(existingTask.boardId, req.userId);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const task = await Task.findByIdAndDelete(req.params.id);

    const io = req.app.get("io");
    io.to(task.boardId.toString()).emit("taskUpdated");

    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;