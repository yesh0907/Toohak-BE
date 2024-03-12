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
import { QuestionSchema } from "./database/schema";

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
      // join websocket "room" to listen for any room specific events
      socket.join(roomId);
    });

    socket.on(
      WS_EVENTS.NEW_PLAYER,
      async ({ roomId, playerId }: { roomId: string; playerId: string }) => {
        // add player to room in DB
        await addPlayerToRoom(roomId, playerId);
        // let everyone else in the room know there is a new player
        io.to(roomId).emit(WS_EVENTS.NEW_PLAYER, { roomId, playerId });
        // update room state only if roomId exists
        if (roomId in perRoomVariables) {
          perRoomVariables[roomId].playerCount++;
          perRoomVariables[roomId].playerScores.set(playerId, 0);
          perRoomVariables[roomId].socketIdsConnected.add(socket.id);
        }
      }
    );

    socket.on(WS_EVENTS.START_QUIZ, async (roomId: string, selectedQuizId: string) => {
      // set room in DB to active
      await setRoomToActive(roomId);
      // reset questionIndex in case room variable for roomId has an old value
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
      // set current question in room's state
      perRoomVariables[roomId].question = schema;
      // convert question into a JSON string
      const data = convertQuestionSchemaToData(perRoomVariables[roomId].question as QuestionSchema);
      // emit question to all participants in the room
      io.to(roomId).emit(WS_EVENTS.NEW_QUESTION, data);

      // start question timer (30 seconds)
      perRoomVariables[roomId].playerAnswerTimeout = setTimeout(() => {
        io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, perRoomVariables[roomId].question?.CorrectAnswer);
      }, TIMEOUT);
      // move to the next question
      perRoomVariables[roomId].questionIndex++;
    });

    socket.on(WS_EVENTS.WAIT_FOR_QUIZ, async (roomId: string, playerId: string) => {
      // keep track of the number of particpants that have sent the event
      perRoomVariables[roomId].recvWaitForQuiz++;
      // check if server has received the event from all the participants
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
          // sort leaderboard by scores and get top 3
          const leaderboard = Array.from(perRoomVariables[roomId].playerScores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
          // get the score of every player or default to 0 if the player doesn't have a score
          const playerScore = perRoomVariables[roomId].playerScores.get(playerId) ?? 0;
          const data = {
            leaderboard, 
            playerScore,
          }
          // set room status to Inactive in DB
          await setRoomToInactive(roomId);
          // broadcast results to the all participants in the room
          io.to(roomId).emit(WS_EVENTS.QUIZ_COMPLETED, data);
          // clean up room state variables to prevent excessive memory consumption
          delete perRoomVariables[roomId];
        } else {
          // update room state with the new question
          perRoomVariables[roomId].question = schema;
          // convert question into a JSON string
          const data = convertQuestionSchemaToData(perRoomVariables[roomId].question as QuestionSchema);
          // broadcast next question to all participants in the room
          io.to(roomId).emit(WS_EVENTS.NEW_QUESTION, data);

          // start question timer (30 seconds)
          perRoomVariables[roomId].playerAnswerTimeout = setTimeout(() => {
            io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, perRoomVariables[roomId].question?.CorrectAnswer);
          }, TIMEOUT);
          // move to the next question
          perRoomVariables[roomId].questionIndex++;
        }
      }
    });

    socket.on(WS_EVENTS.RECV_QUESTION, (roomId) => {
      // keep track of the number of particpants that have sent the event
      perRoomVariables[roomId].recvQuestion++;
      // check if server has received the event from all the participants
      if (perRoomVariables[roomId].recvQuestion === perRoomVariables[roomId].playerCount) {
        // broadcast to all participants that the question timer has started
        io.to(roomId).emit(WS_EVENTS.START_TIMER);
        // reset room state variables for the next question
        perRoomVariables[roomId].recvQuestion = 0;
        perRoomVariables[roomId].recvAnswer = 0;
        perRoomVariables[roomId].recvWaitForQuiz = 0;
      }
    });

    socket.on(
      WS_EVENTS.ANSWER_QUESTION,
      (roomId: string, playerId: string, answer: string) => {
        // keep track of the number of particpants that have sent the event
        perRoomVariables[roomId].recvAnswer++;
        // check if participant answered correctly
        if (answer === perRoomVariables[roomId].question?.CorrectAnswer) {
          // get their current score or default to 0 if they don't have a score
          const currentScore = perRoomVariables[roomId].playerScores.get(playerId) ?? 0;
          // update score by 1
          perRoomVariables[roomId].playerScores.set(playerId, currentScore + 1);
        }

        // check if server has received the event from all the participants
        if (perRoomVariables[roomId].recvAnswer === perRoomVariables[roomId].playerCount) {
          // stop the question timer because all participants have answered the question
          clearTimeout(perRoomVariables[roomId].playerAnswerTimeout);
          // broadcast the correct answer to all participants in the room
          io.to(roomId).emit(WS_EVENTS.SHOW_ANSWER, perRoomVariables[roomId].question?.CorrectAnswer);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      // remove player from room state
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
