import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function BoardsList() {
  const [boards, setBoards] = useState([]);
  const [invites, setInvites] = useState([]);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchBoards = async () => {
    try {
      const res = await API.get("/boards");
      setBoards(res.data);
    } catch (err) {
      console.error("Failed to fetch boards", err);
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await API.get("/boards/invites/pending");
      setInvites(res.data);
    } catch (err) {
      console.error("Failed to fetch invites", err);
    }
  };

  useEffect(() => {
    fetchBoards();
    fetchInvites();
  }, []);

  const handleAccept = async (boardId) => {
    await API.post(`/boards/${boardId}/invites/accept`);
    fetchInvites();
    fetchBoards();
  };

  const handleDecline = async (boardId) => {
    await API.post(`/boards/${boardId}/invites/decline`);
    fetchInvites();
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    try {
      const res = await API.post("/boards", { title: newBoardTitle });
      setNewBoardTitle("");
      setBoards([...boards, res.data]);
    } catch (err) {
      console.error("Failed to create board", err);
    }
  };

  const handleDeleteBoard = async (e, boardId) => {
  e.stopPropagation(); // taaki card ka onClick (navigate) trigger na ho
  const confirmed = window.confirm("Delete this board? All its tasks will be permanently removed.");
  if (!confirmed) return;

  try {
    await API.delete(`/boards/${boardId}`);
    setBoards(boards.filter((b) => b._id !== boardId));
  } catch (err) {
    alert(err.response?.data?.message || "Failed to delete board");
  }
};

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-ink px-6 py-6">
      <div className="flex items-center justify-between mb-8">
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

      <form onSubmit={handleCreateBoard} className="flex gap-3 mb-8 max-w-lg">
        <input
          value={newBoardTitle}
          onChange={(e) => setNewBoardTitle(e.target.value)}
          placeholder="New board name"
          className="flex-1 bg-panel border border-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal transition"
        />
        <button
          type="submit"
          className="bg-teal text-ink font-semibold px-5 rounded-lg hover:opacity-90 transition"
        >
          Create
        </button>
      </form>

      {invites.length > 0 && (
        <div className="mb-8">
          <h3 className="text-gray-400 text-sm mb-2">Pending Invites</h3>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv._id}
                className="bg-panel border border-border rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-white text-sm font-medium">{inv.title}</p>
                  <p className="text-gray-500 text-xs">Invited by {inv.owner?.name}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(inv._id)}
                    className="text-xs bg-teal text-ink px-3 py-1.5 rounded-lg font-medium"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(inv._id)}
                    className="text-xs border border-border text-gray-400 px-3 py-1.5 rounded-lg"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {boards.map((board) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
  {boards.map((board) => (
    <div
      key={board._id}
      onClick={() => navigate(`/board/${board._id}`)}
      className="bg-panel border border-border rounded-xl p-5 cursor-pointer hover:border-teal transition relative group"
    >
      <button
        onClick={(e) => handleDeleteBoard(e, board._id)}
        className="absolute top-3 right-3 text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition"
        title="Delete board"
      >
        ✕
      </button>
      <h3 className="font-display font-medium text-white pr-6">{board.title}</h3>
      <p className="text-gray-500 text-xs mt-1">
        {board.members?.length || 1} member{board.members?.length !== 1 ? "s" : ""}
      </p>
    </div>
  ))}

  {boards.length === 0 && (
    <p className="text-gray-600 text-sm col-span-full text-center py-10">
      No boards yet. Create your first one above.
    </p>
  )}
</div>
        ))}

        {boards.length === 0 && (
          <p className="text-gray-600 text-sm col-span-full text-center py-10">
            No boards yet. Create your first one above.
          </p>
        )}
      </div>
    </div>
  );
}