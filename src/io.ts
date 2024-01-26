import { Server as IOServer } from "socket.io";
import { ServerType } from "@hono/node-server/dist/types";
import { WS_EVENTS } from "./events";

export const startIOServer = (httpServer: ServerType) => {
  const io = new IOServer(httpServer, {
    // Cross-Origin Resource Sharing
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Handle new web socket connection
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on(WS_EVENTS.JOIN_ROOM, (room_id: string) => {
      console.log(`Room ID received: ${room_id}`);
    });

    socket.on(WS_EVENTS.NEW_PLAYER, (playerID: string) => {
        console.log(`Player ${playerID} joined the room`);
    });

    socket.on(WS_EVENTS.START_QUIZ, () => {
        console.log(`${socket.id} started the game!`);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
