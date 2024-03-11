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
import {perRoomVariables} from "./index";

const TIMEOUT = 31000;


export const startIOServer = (httpServer: ServerType) => {
  const io = new IOServer(httpServer, {
    // Cross-Origin Resource Sharing
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Handle new web socket connection
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on(WS_EVENTS.JOIN_ROOM, (roomId: string) => {
      console.log(`Room ID received: ${roomId}`);

      // join websocket "room" to listen for any room specific events
      socket.join(roomId);
    });

    socket.on(
      WS_EVENTS.NEW_PLAYER,
      async ({ roomId, playerId }: { roomId: string; playerId: string }) => {
        console.log(`Player ${playerId} joined the room`);
        // add player to room in DB
        await addPlayerToRoom(roomId, playerId);
        // let everyone else in the room know there is a new player
        io.to(roomId).emit(WS_EVENTS.NEW_PLAYER, { roomId, playerId });
        if (roomId in perRoomVariables) {
          perRoomVariables[roomId].playerCount++;
          perRoomVariables[roomId].playerScores.set(playerId, 0);
          perRoomVariables[roomId].socketIdsConnected.add(socket.id);
        }
      }
    );

    socket.on(WS_EVENTS.START_QUIZ, async (roomId: string, selectedQuizId: string) => {
      perRoomVariables[roomId].questionIndex = 0;
      console.log(`${socket.id} started the game!`);
      // set room in DB to active
      await setRoomToActive(roomId);
      perRoomVariables[roomId].questionIndex = 0;
      perRoomVariables[roomId].quizId = selectedQuizId;
      // storing question so that we can send correct answer without repetitive DB calls
      const { error, question: schema } = await getQuestionSchema(
        perRoomVariables[roomId].quizId,
        perRoomVariables[roomId].questionIndex
      );
      if (error || schema == null) {
        console.error("start quiz: unable to get question");
        return;
      }
      perRoomVariables[roomId].question = schema;
      const data = convertQuestionSchemaToData(perRoomVariables[roomId].question);
      io.to(roomId).emit(WS_EVENTS.NEW_QUESTION, data);

      perRoomVariables[roomId].playerAnswerTimeout = setTimeout(() => {
        io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, perRoomVariables[roomId].question?.CorrectAnswer);
      }, TIMEOUT);
      perRoomVariables[roomId].questionIndex++;
    });

    socket.on(WS_EVENTS.WAIT_FOR_QUIZ, async (roomId: string, playerId: string) => {
      perRoomVariables[roomId].recvWaitForQuiz++;
      if (perRoomVariables[roomId].recvWaitForQuiz === perRoomVariables[roomId].playerCount) {
        // get next question
        const { error, question: schema } = await getQuestionSchema(
          perRoomVariables[roomId].quizId,
          perRoomVariables[roomId].questionIndex
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
          const leaderboard = Array.from(perRoomVariables[roomId].playerScores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
          const playerScore = perRoomVariables[roomId].playerScores.get(playerId) ?? 0;
          const data = {
            leaderboard, 
            playerScore,
          }
          await setRoomToInactive(roomId);
          io.to(roomId).emit(WS_EVENTS.QUIZ_COMPLETED, data);
          delete perRoomVariables[roomId];
        } else {
          console.log('next question');
          perRoomVariables[roomId].question = schema;
          const data = convertQuestionSchemaToData(perRoomVariables[roomId].question);
          io.to(roomId).emit(WS_EVENTS.NEW_QUESTION, data);

          perRoomVariables[roomId].playerAnswerTimeout = setTimeout(() => {
            io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, perRoomVariables[roomId].question?.CorrectAnswer);
          }, TIMEOUT);
          perRoomVariables[roomId].questionIndex++;
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
      perRoomVariables[roomId].recvQuestion++;
      if (perRoomVariables[roomId].recvQuestion === perRoomVariables[roomId].playerCount) {
        io.to(roomId).emit(WS_EVENTS.START_TIMER);
        perRoomVariables[roomId].recvQuestion = 0;
        perRoomVariables[roomId].recvAnswer = 0;
        perRoomVariables[roomId].recvWaitForQuiz = 0;
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
        perRoomVariables[roomId].recvAnswer++;
        if (answer === perRoomVariables[roomId].question?.CorrectAnswer) {
          const currentScore = perRoomVariables[roomId].playerScores.get(playerId) ?? 0;
          perRoomVariables[roomId].playerScores.set(playerId, currentScore + 1);
        }

        if (perRoomVariables[roomId].recvAnswer === perRoomVariables[roomId].playerCount) {
          clearTimeout(perRoomVariables[roomId].playerAnswerTimeout);
          io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, perRoomVariables[roomId].question?.CorrectAnswer);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      for (const roomId in perRoomVariables) {
        const roomVariables = perRoomVariables[roomId];
        if (roomVariables.socketIdsConnected.has(socket.id)) {
            perRoomVariables[roomId].playerCount--;
            break;
        }
      }
    });
  });
};
