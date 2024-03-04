import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { startIOServer } from "./io";
import { DbInterface } from "./database/db";

// Connect to DB
const db = new DbInterface();

// Create Hono App
const app = new Hono();

// Set up logger for all routes
app.use("*", logger());

// Set up cors for all routes
app.use(cors());

// Starter route
app.get("/", (c) => {
    return c.text("Hello Hono!");
});

// Check the status if the backend is running
app.get("/health", (c) => {
    return c.json({ running: true });
});

// Create room
app.post("/create-room", async (c) => {
    const { hostWsId } = await c.req.json<{hostWsId: string}>();
    // create room record in db
    const roomId = await db.createRoom(hostWsId);
    if (roomId == null) {
        return c.json({ error: 'could not create room' }, 500);
    }
    return c.json({ roomId });
});

// Add question to quiz
app.post("/insert-question", async (c) => {
    const { quizId, Question, PossibleAnswers, CorrectAnswer, QuestionType } = 
    await c.req.json<{quizId: string, Question: string, PossibleAnswers: Map<string, string>, CorrectAnswer: string, QuestionType?: string}>();
    const updatedQuestionType = QuestionType ?? "MCQ";

    try {
        const newQuestionId = await db.createQuestion(Question, PossibleAnswers, CorrectAnswer, updatedQuestionType);

        if (newQuestionId == null) {
            return c.json({ error: "Failed to create question" }, 500);
        }

        const quiz = await db.getQuiz(quizId);
        if (quiz == null) {
            return c.json({ error: "Quiz does not exist"}, 500);
        }

        const updatedQuestions = [...quiz.Questions, newQuestionId];
        await db.updateQuizQuestionIds(quizId, updatedQuestions);
        return c.json({ message: 'Question added to quiz' });
    } catch (error) {
        console.error('Error inserting question into quiz:', error);
        return c.json({ error: 'Failed to insert question into quiz' }, 500);
    }
});

const port = 3000;

// Start an HTTP server to serve the Hono App
const httpServer = serve({
    fetch: app.fetch,
    port,
});

// Create Socket.io server on top of the HTTP server
startIOServer(httpServer);

httpServer.listen(port, () => {
    console.log(`Toohak Backend is running on port ${port}`);
});
