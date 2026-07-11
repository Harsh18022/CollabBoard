CollabBoard
A real-time, multi-board Kanban task manager built with the MERN stack — featuring live collaboration via Socket.io and dependency-based task locking powered by graph algorithms (topological sort + cycle detection).
Unlike a typical CRUD Kanban clone, CollabBoard models task dependencies as a directed graph: a task automatically locks until every task it depends on is marked done, and the system detects circular dependencies before they can be created.
---
Features
Authentication — JWT-based register/login with bcrypt password hashing
Multiple Boards — Create and manage any number of independent boards
Kanban Workflow — Drag-and-drop tasks across To Do / In Progress / Done columns
Dependency Locking — Tasks stay locked (and undraggable) until their dependencies are marked complete
Cycle Detection — DFS-based algorithm rejects circular dependency chains (e.g., A → B → A) at creation time
Real-Time Sync — Socket.io broadcasts task changes instantly to every user viewing the same board — no refresh needed
Team Collaboration — Invite collaborators by email; invitees must accept or decline before joining a board
Access Control — Only board owners and accepted members can view or modify a board's tasks; only the owner can invite or delete the board
---
Tech Stack
Layer	Technology
Frontend	React (Vite), Tailwind CSS v4, @hello-pangea/dnd
Backend	Node.js, Express.js
Database	MongoDB Atlas, Mongoose
Real-time	Socket.io
Auth	JWT, bcryptjs
---
Architecture Highlight: Dependency Locking
Each task stores a `dependsOn` array of task IDs. On every fetch, the backend computes lock status on the fly:
```js
function calculateLockStatus(tasks) {
  const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));
  return tasks.map((task) => {
    const isLocked = task.dependsOn.some((depId) => {
      const depTask = taskMap.get(depId.toString());
      return depTask && depTask.status !== "done";
    });
    return { ...task.toObject(), isLocked };
  });
}
```
Before a new dependency link is created, a DFS-based cycle check runs across the board's task graph to reject invalid, circular chains — preventing a deadlock where two tasks permanently lock each other.
---
Project Structure
```
collabboard/
├── backend/
│   ├── models/        # User, Board, Task schemas
│   ├── routes/         # auth, boards, tasks REST endpoints
│   ├── middleware/     # JWT auth middleware
│   ├── utils/           # topoSort.js — lock status + cycle detection
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/  # Login, Register, BoardsList, Board
    │   ├── context/      # AuthContext
    │   ├── api/            # Axios instance with auto token injection
    │   └── socket.js
    └── vite.config.js
```
---
Getting Started
Prerequisites
Node.js (v18+)
A MongoDB Atlas cluster (or local MongoDB instance)
Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in `backend/`:
```
MONGO_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_random_secret_string
```
Run the server:
```bash
node server.js
```
Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173` to use the app.
---
Future Improvements
Drag-and-drop reordering within the same column
Due dates and priority labels on tasks
Email notifications for invites (currently in-app only)
Board-level activity log / audit trail
---
Author
Harsh Kumar Sharma
GitHub · LinkedIn
