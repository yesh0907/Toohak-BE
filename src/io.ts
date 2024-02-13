import { Server as IOServer } from "socket.io";
import { ServerType } from "@hono/node-server/dist/types";
import { WS_EVENTS } from "./events";
import { getQuestionDataForPlayer } from "./ioOperations";

const DEFAULT_QUIZ = "65c0a4c2b07b34c123fc0b29"
let recvQuestion = 0, playerCount = 0, questionIndex = 0;

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
      socket.join(room_id);

      if (room_id === '1234') {
        playerCount++;
        console.log(`Player count: ${playerCount}`);
        const playerId = `player${playerCount}`;
        io.to(room_id).emit(WS_EVENTS.NEW_PLAYER, playerId);
      }
    });

    socket.on(WS_EVENTS.NEW_PLAYER, (playerID: string) => {
        console.log(`Player ${playerID} joined the room`);
    });

    socket.on(WS_EVENTS.START_QUIZ, async (roomId: string) => {
      console.log(`${socket.id} started the game!`)
      const data = await getQuestionDataForPlayer(roomId, DEFAULT_QUIZ, questionIndex);
      io.to(roomId).emit(WS_EVENTS.NEW_QUESTION, data);
      questionIndex++;
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

    socket.on(WS_EVENTS.RECV_QUESTION, (roomId) => {
      console.log(`Received question`);
      recvQuestion++;
      if (recvQuestion === playerCount) {
        io.to(roomId).emit(WS_EVENTS.START_TIMER);
        recvQuestion = 0;
      }
    });

    socket.on(WS_EVENTS.NEW_QUESTION, () => {
      console.log(`New question`);
    });

    socket.on(WS_EVENTS.SHOW_ANSWER, () => {
      console.log(`Show answer`);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      playerCount--;
    });
  });
};
