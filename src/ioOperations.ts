import {DbInterface} from "./database/db";
import {QuestionSchema} from "./database/schema";

const db = new DbInterface();

export async function getQuestionSchema(quizId: string, questionIndex: number) {
  const quiz = await db.getQuiz(quizId);
  if (!quiz) {
    return {
      error: true,
      question: null
    };
  }

  // no more questions
  if (quiz.Questions.length === questionIndex) {
    return {
      error: false,
      question: null
    };
  }

  const question = await db.getQuestion(quiz.Questions[questionIndex]);
  if (!question) {
    return {
      error: true,
      question: null
    };
  }

  return {
    error: false,
    question
  };
}

export function convertQuestionSchemaToData(question: QuestionSchema) {
  return {
    question: question.Question,
    answers: Array.from(question?.PossibleAnswers.values())
  }
}

export async function setRoomToActive(roomId: string) {
  await db.updateRoomState(roomId, 'ACTIVE');
}

export async function setRoomToInactive(roomId: string) {
  await db.updateRoomState(roomId, "INACTIVE");
}

export async function addPlayerToRoom(roomId: string, playerId: string) {
  await db.appendPlayerIdToRoom(roomId, playerId);
}

// Room State Variables
export interface RoomVariables {
    recvQuestion: number;
    playerCount: number;
    questionIndex: number;
    recvAnswer: number;
    recvWaitForQuiz: number;
    question: QuestionSchema | undefined;
    playerScores: Map<string, number>;
    playerAnswerTimeout: ReturnType<typeof setInterval> | undefined;
    quizId: string;
    socketIdsConnected: Set<string>;
}

export function initializeRoomVariables(roomId: string, roomVariables: {[roomName: string]: RoomVariables}) {
    roomVariables[roomId] = {
        recvQuestion: 0,
        playerCount: 0,
        questionIndex: 0,
        recvAnswer: 0,
        recvWaitForQuiz: 0,
        question: undefined,
        playerScores: new Map<string, number>(),
        playerAnswerTimeout: undefined,
        quizId: "",
        socketIdsConnected: new Set<string>()
    };
}
