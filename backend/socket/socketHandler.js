export default function socketHandler(io) {
  let activeUsers = 0;

  io.on("connection", (socket) => {
    activeUsers++;
    io.emit("active_users_update", { count: activeUsers });

    socket.on("join_class", (classId) => {
      socket.join(classId);
    });

    socket.on("leave_class", (classId) => {
      socket.leave(classId);
    });

    socket.on("disconnect", () => {
      activeUsers--;
      io.emit("active_users_update", { count: activeUsers });
    });
  });
}
