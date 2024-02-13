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
      // join websocket "room" to listen for any room specific events
      socket.join(room_id);
    });

    socket.on(
      WS_EVENTS.NEW_PLAYER,
      ({ roomId, playerId }: { roomId: string; playerId: string }) => {
        console.log(`Player ${playerId} joined the room`);
        // let everyone else in the room know there is a new player
        io.to(roomId).emit(WS_EVENTS.NEW_PLAYER, { roomId, playerId });
      }
    );

    socket.on(WS_EVENTS.START_QUIZ, () => {
      console.log(`${socket.id} started the game!`);
    });

    socket.on(WS_EVENTS.WAIT_FOR_QUIZ, () => {
      console.log(`Waiting for game to start...`);
    });

    socket.on(WS_EVENTS.QUIZ_COMPLETED, () => {
      console.log(`Quiz has completed!`);
    });

    socket.on(WS_EVENTS.START_TIMER, () => {
      console.log(`Start timer`);
    });

    socket.on(WS_EVENTS.RECV_QUESTION, () => {
      console.log(`Received question`);
    });

    socket.on(WS_EVENTS.NEW_QUESTION, () => {
      console.log(`New question`);
    });

    socket.on(WS_EVENTS.SHOW_ANSWER, () => {
      console.log(`Show answer`);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
