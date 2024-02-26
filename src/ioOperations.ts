import {DbInterface} from "./database/db";
import {QuestionSchema} from "./database/schema";

const db = new DbInterface();

export async function getQuestionSchema(quizId: string, questionIndex: number) {
  const quiz = await db.getQuiz(quizId);
  if (!quiz) {
    console.error(`quiz not found with id: ${quizId}`);
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
    console.error(`question not found with id: ${quiz.Questions[questionIndex]}`);
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
