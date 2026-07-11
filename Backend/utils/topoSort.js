// Calculate lock status for each task based on its dependencies
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

// Detect circular dependencies using DFS (prevents invalid dependency chains)
function hasCycle(tasks) {
  const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));
  const visited = new Set();
  const inStack = new Set();

  function dfs(taskId) {
    if (inStack.has(taskId)) return true; // cycle found
    if (visited.has(taskId)) return false;

    visited.add(taskId);
    inStack.add(taskId);

    const task = taskMap.get(taskId);
    if (task) {
      for (const depId of task.dependsOn) {
        if (dfs(depId.toString())) return true;
      }
    }

    inStack.delete(taskId);
    return false;
  }

  for (const task of tasks) {
    if (dfs(task._id.toString())) return true;
  }
  return false;
}

module.exports = { calculateLockStatus, hasCycle };