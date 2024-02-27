import { Server as IOServer } from "socket.io";
import { ServerType } from "@hono/node-server/dist/types";
import { WS_EVENTS } from "./events";
import {
  addPlayerToRoom,
  convertQuestionSchemaToData,
  getQuestionSchema,
  setRoomToActive,
  setRoomToInactive,
} from "./ioOperations";
import { QuestionSchema } from "./database/schema";

const DEFAULT_QUIZ = "65c0a4c2b07b34c123fc0b29";
const TIMEOUT = 31000;

let recvQuestion = 0,
  playerCount = 0,
  questionIndex = 0,
  recvAnswer = 0,
  recvWaitForQuiz = 0;
let question: QuestionSchema | undefined;
let playerScores = new Map<string, number>();
let playerAnswerTimeout: ReturnType<typeof setInterval>;

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
      questionIndex = 0;
      console.log(`${socket.id} started the game!`);
      // set room in DB to active
      await setRoomToActive(roomId);
      questionIndex = 0;
      // storing question so that we can send correct answer without repetitive DB calls
      const { error, question: schema } = await getQuestionSchema(
        DEFAULT_QUIZ,
        questionIndex
      );
      if (error || schema == null) {
        console.error("start quiz: unable to get question");
        return;
      }
      question = schema;
      const data = convertQuestionSchemaToData(question);
      io.to(roomId).emit(WS_EVENTS.NEW_QUESTION, data);

      playerAnswerTimeout = setTimeout(() => {
        io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, question?.CorrectAnswer);
      }, TIMEOUT);
      questionIndex++;
    });

    socket.on(WS_EVENTS.WAIT_FOR_QUIZ, async (roomId: string, playerId: string) => {
      recvWaitForQuiz++;
      if (recvWaitForQuiz === playerCount) {
        // get next question
        const { error, question: schema } = await getQuestionSchema(
          DEFAULT_QUIZ,
          questionIndex
        );
        // check if question is undefined
        if (error) {
          console.error(
            `waiting for quiz: unable to get question for room ${roomId}`
          );
          return;
        }
        // no more questions, so it is the end of the quiz
        if (schema == null) {
          console.log('quiz done');
          // sort leaderboard by scores and get top 3
          const leaderboard = Array.from(playerScores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
          const playerScore = playerScores.get(playerId) ?? 0;
          const data = {
            leaderboard, 
            playerScore,
          }
          await setRoomToInactive(roomId);
          io.to(roomId).emit(WS_EVENTS.QUIZ_COMPLETED, data);
        } else {
          console.log('next question');
          question = schema;
          const data = convertQuestionSchemaToData(question);
          io.to(roomId).emit(WS_EVENTS.NEW_QUESTION, data);

          playerAnswerTimeout = setTimeout(() => {
            io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, question?.CorrectAnswer);
          }, TIMEOUT);
          questionIndex++;
        }
      }
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
        recvAnswer = 0;
        recvWaitForQuiz = 0;
      }
    });

    socket.on(WS_EVENTS.NEW_QUESTION, () => {
      console.log(`New question`);
    });

    socket.on(WS_EVENTS.SHOW_ANSWER, () => {
      console.log(`Show answer`);
    });

    socket.on(
      WS_EVENTS.ANSWER_QUESTION,
      (roomId: string, playerId: string, answer: string) => {
        recvAnswer++;
        if (answer === question?.CorrectAnswer) {
          const currentScore = playerScores.get(playerId) ?? 0;
          playerScores.set(playerId, currentScore + 1);
        }

        if (recvAnswer === playerCount) {
          clearTimeout(playerAnswerTimeout);
          io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, question?.CorrectAnswer);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      playerCount--;
    });
  });
};
