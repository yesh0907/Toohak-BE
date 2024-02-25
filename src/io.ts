import { Server as IOServer } from "socket.io";
import { ServerType } from "@hono/node-server/dist/types";
import { WS_EVENTS } from "./events";
import {addPlayerToRoom, convertQuestionSchemaToData, getQuestionSchema, setRoomToActive} from "./ioOperations";
import {QuestionSchema} from "./database/schema";

const DEFAULT_QUIZ = "65c0a4c2b07b34c123fc0b29"
const TIMEOUT = 31000

let recvQuestion = 0, playerCount = 0, questionIndex = 0, recvAnswer = 0;
let question: QuestionSchema;
let playerScores = new Map<string, number>();
let playerAnswerTimeout;

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
      async ({ roomId, playerId }: { roomId: string; playerId: string }) => {
        console.log(`Player ${playerId} joined the room`);
        // add player to room in DB
        await addPlayerToRoom(roomId, playerId);
        playerScores.set(playerId, 0);
        // let everyone else in the room know there is a new player
        io.to(roomId).emit(WS_EVENTS.NEW_PLAYER, { roomId, playerId });
        playerCount++;
      }
    );

    socket.on(WS_EVENTS.START_QUIZ, async (roomId: string) => {
      console.log(`${socket.id} started the game!`);
      // set room in DB to active
      await setRoomToActive(roomId);
      // storing question so that we can send correct answer without repetitive DB calls
      question = await getQuestionSchema(DEFAULT_QUIZ, questionIndex);
      const data = convertQuestionSchemaToData(question);
      io.to(roomId).emit(WS_EVENTS.NEW_QUESTION, data);

      playerAnswerTimeout = setTimeout(() => {
        io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, question.CorrectAnswer);
        }, TIMEOUT);
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

    socket.on(WS_EVENTS.ANSWER_QUESTION, (roomId: string, playerId: string, answer: string) => {
      recvAnswer++;
      if (answer === question.CorrectAnswer) {
        const currentScore = playerScores.get(playerId);
        playerScores.set(playerId, currentScore + 1);
      }

      if (recvAnswer === playerCount) {
        clearTimeout(playerAnswerTimeout);
        io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, question.CorrectAnswer);
      }
      })

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      playerCount--;
    });
  });
};
