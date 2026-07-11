const express = require("express");
const Board = require("../models/Board");
const User = require("../models/User");
const protect = require("../middleware/auth");

const router = express.Router();

// Helper: check if user has access to board (owner or member)
async function hasAccess(board, userId) {
  return (
    board.owner.toString() === userId ||
    board.members.some((m) => m.toString() === userId)
  );
}

// CREATE board
router.post("/", protect, async (req, res) => {
  try {
    const { title } = req.body;
    const board = await Board.create({
      title,
      owner: req.userId,
      members: [req.userId],
    });
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET all boards for logged-in user (owner or member)
router.get("/", protect, async (req, res) => {
  try {
    const boards = await Board.find({ members: req.userId });
    res.json(boards);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET pending invites for logged-in user
router.get("/invites/pending", protect, async (req, res) => {
  try {
    const boards = await Board.find({ pendingInvites: req.userId }).populate("owner", "name email");
    res.json(boards);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});



// GET single board (only if owner/member)
router.get("/:id", protect, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id).populate("members", "name email");
    if (!board) return res.status(404).json({ message: "Board not found" });

    const allowed = await hasAccess(board, req.userId);
    if (!allowed) {
      return res.status(403).json({ message: "You don't have access to this board" });
    }

    res.json(board);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

const Task = require("../models/Task");

// DELETE board (owner only) — also deletes all tasks in that board
router.delete("/:id", protect, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    if (board.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the board owner can delete this board" });
    }

    // Delete all tasks belonging to this board first
    await Task.deleteMany({ boardId: req.params.id });

    // Then delete the board itself
    await Board.findByIdAndDelete(req.params.id);

    res.json({ message: "Board deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// SEND invite (owner only) — now goes to pendingInvites, not members directly
router.post("/:id/members", protect, async (req, res) => {
  try {
    const { email } = req.body;
    const board = await Board.findById(req.params.id);

    if (!board) return res.status(404).json({ message: "Board not found" });

    if (board.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the board owner can invite members" });
    }

    const userToInvite = await User.findOne({ email: email.toLowerCase() });
    if (!userToInvite) {
      return res.status(404).json({ message: "No user found with this email" });
    }

    if (board.members.includes(userToInvite._id)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    if (board.pendingInvites.includes(userToInvite._id)) {
      return res.status(400).json({ message: "Invite already sent" });
    }

    board.pendingInvites.push(userToInvite._id);
    await board.save();

    res.json({ message: "Invite sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ACCEPT invite
router.post("/:id/invites/accept", protect, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    if (!board.pendingInvites.includes(req.userId)) {
      return res.status(400).json({ message: "No pending invite found" });
    }

    board.pendingInvites = board.pendingInvites.filter((id) => id.toString() !== req.userId);
    board.members.push(req.userId);
    await board.save();

    res.json({ message: "Invite accepted", board });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DECLINE invite
router.post("/:id/invites/decline", protect, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    board.pendingInvites = board.pendingInvites.filter((id) => id.toString() !== req.userId);
    await board.save();

    res.json({ message: "Invite declined" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;