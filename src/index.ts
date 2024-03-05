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

// Add question, return id
app.post("/create-question", async (c) => {
    const { Question, PossibleAnswers, CorrectAnswer, QuestionType } = 
    await c.req.json<{Question: string, PossibleAnswers: Map<string, string>, CorrectAnswer: string, QuestionType?: string}>();
    const updatedQuestionType = QuestionType ?? "MCQ";

    const newQuestionId = await db.createQuestion(Question, PossibleAnswers, CorrectAnswer, updatedQuestionType);
    if (newQuestionId == null) {
        return c.json({ error: "Failed to create question" }, 500);
    }
    return c.json({ newQuestionId });
});

// Create quiz
app.post("/create-quiz", async (c) => {
    const { quizQuestions } = await c.req.json<{quizQuestions: Array<string>}>();
    // create quiz in db
    const quizId = await db.createQuiz(quizQuestions)
    if (quizId == null) {
        console.log("quizId: ", quizId);
        return c.json({ error: 'could not create quiz' }, 500);
    }
    return c.json({ quizId });
})

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
