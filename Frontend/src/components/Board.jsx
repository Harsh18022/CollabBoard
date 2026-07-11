import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams, Link } from "react-router-dom";
import socket from "../socket";

const COLUMNS = [
  { id: "todo", title: "To Do", dot: "bg-gray-400" },
  { id: "in-progress", title: "In Progress", dot: "bg-teal" },
  { id: "done", title: "Done", dot: "bg-green-500" },
];

export default function Board() {
  const { boardId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [board, setBoard] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchBoard = async () => {
    try {
      const res = await API.get(`/boards/${boardId}`);
      setBoard(res.data);
    } catch (err) {
      console.error("Failed to fetch board", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await API.get(`/tasks/board/${boardId}`);
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchBoard();
    socket.emit("joinBoard", boardId);
    socket.on("taskUpdated", fetchTasks);
    return () => socket.off("taskUpdated", fetchTasks);
  }, [boardId]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await API.post("/tasks", { title: newTaskTitle, boardId });
      setNewTaskTitle("");
      fetchTasks();
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteMsg("");
    try {
      await API.post(`/boards/${boardId}/members`, { email: inviteEmail });
      setInviteMsg("Member added!");
      setInviteEmail("");
      fetchBoard();
    } catch (err) {
      setInviteMsg(err.response?.data?.message || "Failed to add member");
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const task = tasks.find((t) => t._id === draggableId);
    if (task.isLocked) return;

    try {
      await API.put(`/tasks/${draggableId}`, { status: destination.droppableId });
      fetchTasks();
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-ink px-6 py-6">
      <Link to="/boards" className="text-gray-500 text-sm hover:text-teal transition">
        ← Back to Boards
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">CollabBoard</h1>
          <p className="text-gray-500 text-sm">Welcome back, {user?.name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 border border-border rounded-lg px-4 py-2 hover:bg-panel transition"
        >
          Logout
        </button>
      </div>

      {/* Invite members */}
      <div className="mb-6">
        <form onSubmit={handleInvite} className="flex gap-2 max-w-md">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Invite by email"
            className="flex-1 bg-panel border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal transition"
          />
          <button
            type="submit"
            className="bg-panel border border-border text-teal text-sm px-4 rounded-lg hover:border-teal transition"
          >
            Invite
          </button>
        </form>
        {inviteMsg && <p className="text-xs text-gray-400 mt-1">{inviteMsg}</p>}

        {board?.members?.length > 0 && (
          <div className="flex gap-2 mt-2">
            {board.members.map((m) => (
              <span
                key={m._id}
                className="text-xs bg-panel border border-border rounded-full px-3 py-1 text-gray-400"
              >
                {m.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Add task */}
      <form onSubmit={handleAddTask} className="flex gap-3 mb-8 max-w-lg">
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="What needs to get done?"
          className="flex-1 bg-panel border border-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal transition"
        />
        <button
          type="submit"
          className="bg-teal text-ink font-semibold px-5 rounded-lg hover:opacity-90 transition"
        >
          Add
        </button>
      </form>

      {/* Board columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-5 overflow-x-auto pb-4">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column.id);
            return (
              <Droppable droppableId={column.id} key={column.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-panel border border-border rounded-xl w-72 flex-shrink-0 min-h-[70vh]"
                  >
                    {/* Column title bar */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                      <span className={`w-2.5 h-2.5 rounded-full ${column.dot}`} />
                      <span className="font-display font-medium text-gray-200 text-sm">
                        {column.title}
                      </span>
                      <span className="ml-auto text-xs text-gray-500 bg-ink rounded-full px-2 py-0.5">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="p-3 space-y-2.5">
                      {columnTasks.map((task, index) => (
                        <Draggable
                          draggableId={task._id}
                          index={index}
                          key={task._id}
                          isDragDisabled={task.isLocked}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`rounded-lg px-3.5 py-3 text-sm transition ${
                                task.isLocked
                                  ? "bg-transparent border border-dashed border-amber/50 text-amber/80"
                                  : "bg-white text-gray-800 shadow-sm hover:shadow-md cursor-grab"
                              }`}
                              style={provided.draggableProps.style}
                            >
                              <div className="flex items-center gap-2">
                                {task.isLocked && <span>🔒</span>}
                                <span className="font-medium">{task.title}</span>
                              </div>
                              {task.isLocked && (
                                <p className="text-xs text-amber/60 mt-1">
                                  Waiting on dependency
                                </p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {columnTasks.length === 0 && (
                        <p className="text-gray-600 text-xs text-center py-6">No tasks here</p>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}