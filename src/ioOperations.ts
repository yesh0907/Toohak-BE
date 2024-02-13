import {WS_EVENTS} from "./events";
import {DbInterface} from "./database/db";

const db = new DbInterface();

export function sendQuestionToPlayers(roomId: string, io, questions, questionIndex) {

  db.getQuestion(questions[questionIndex]).then((question) => {
    const data = {
      question: question?.Question,
      answers: Array.from(question?.PossibleAnswers.values())
    }

    io.to(roomId).emit(WS_EVENTS.NEW_QUESTION, data);
  });
}
