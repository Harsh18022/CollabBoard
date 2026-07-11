const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["todo", "in-progress", "done"],
    default: "todo",
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Board",
    required: true,
  },
  dependsOn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
  }],
}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);