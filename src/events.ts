// Synchronized event file between frontend and backend
export const WS_EVENTS = {
    JOIN_ROOM: 'joinRoom',
    NEW_PLAYER: 'newPlayer',
    START_QUIZ: 'startQuiz',
    WAIT_FOR_QUIZ: "waitForQuiz", 
    QUIZ_COMPLETED: "quizCompleted", 
    START_TIMER: "startTimer",
    RECV_QUESTION: "recvQuestion",
    NEW_QUESTION: "newQuestion",
    SHOW_ANSWER: "showAnswer",
    ANSWER_QUESTION: "answerQuestion"
}
