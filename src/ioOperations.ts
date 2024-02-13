import {DbInterface} from "./database/db";

const db = new DbInterface();

export async function getQuestionDataForPlayer(roomId: string, quizId: string, questionIndex: number) {
  const quiz = await db.getQuiz(quizId);
  if (!quiz) {
    console.error(`quiz not found with id: ${quizId}`);
    return;
  }

  const question = await db.getQuestion(quiz.Questions[questionIndex]);
  return {
    question: question?.Question,
    answers: Array.from(question?.PossibleAnswers.values())
  }
}
