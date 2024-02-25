import {DbInterface} from "./database/db";

const db = new DbInterface();

export async function getQuestionDataForPlayer(roomId: string, quizId: string, questionIndex: number) {
  const quiz = await db.getQuiz(quizId);
  if (!quiz) {
    console.error(`quiz not found with id: ${quizId}`);
    return;
  }

  const question = await db.getQuestion(quiz.Questions[questionIndex]);
  if (!question) {
    console.error(`question not found with id: ${quiz.Questions[questionIndex]}`);
    return;
  }

  return {
    question: question.Question,
    answers: Array.from(question?.PossibleAnswers.values())
  }
}

export async function setRoomToActive(roomId: string) {
  await db.updateRoomState(roomId, 'ACTIVE');
}

export async function addPlayerToRoom(roomId: string, playerId: string) {
  return await db.appendPlayerIdToRoom(roomId, playerId);
}
