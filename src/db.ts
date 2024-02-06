import mongoose from "mongoose";
import * as dotenv from 'dotenv';
import { RoomSchema, QuizSchema, QuestionSchema } from './database/schema';
import { getModelForClass } from "@typegoose/typegoose";

dotenv.config();

if (process.env.MONGO_URI === undefined) {
    console.error('env variable MONGO_URI is not set in .env file');
    process.exit(1);
}

const uri = process.env.MONGO_URI;

class DbHandler {
    private static instance: DbHandler | null = null;
    
    private constructor() {
        this.connect().catch((error) => {
            console.error("Database connection error:", error);
            process.exit(1);
        });
    }

    public static getInstance(): DbHandler {
        if (!DbHandler.instance) {
            DbHandler.instance = new DbHandler();
        }
        return DbHandler.instance;
    }

    private async connect(): Promise<void> {
        await mongoose.connect(uri);
    }

    private async disconnect(): Promise<void> {
        await mongoose.disconnect();
    }

    public async createRoom(roomData: RoomSchema): Promise<void> {
        try {
            const roomModel = getModelForClass(RoomSchema);
            const room = await roomModel.create(roomData);
            await room.save();
            console.log(`New room created with id (handler): ${room._id}`);
        } catch (error) {
            console.error("Room create error (handler):", error);
        }
    }

    public async updateRoom(roomId: string, updateData: {
        RoomState?: string,
        PlayerIds?: Array<string>,
        HostWsId?: string
    }): Promise<void> {
        const roomModel = getModelForClass(RoomSchema);  
        try {
            const res = await roomModel.updateOne({ _id: roomId }, updateData);
            console.log(`Room updated with id (handler): ${roomId}`);
        } catch (error) {
            console.error("Room update error (handler):", error);
        }
    }

    public async createQuiz(quizData: QuizSchema): Promise<void> {
        try {
            const quizModel = getModelForClass(QuizSchema);
            const quiz = await quizModel.create(quizData);
            await quiz.save();
            console.log(`New quiz created with id (handler): ${quiz._id}`);
        } catch (error) {
            console.error("Quiz create error (handler):", error);
        }
    }

    public async updateQuizList(quizId: string, updateData: {
        Questions?: Array<string>,
    }): Promise<void> {
        const quizModel = getModelForClass(QuizSchema);
        try {
            const res = await quizModel.updateOne({ _id: quizId }, updateData);
            console.log(`Quiz updated with id (handler): ${quizId}`);
        } catch (error) {
            console.error("Quiz update error (handler):", error);
        }
    }

    public async createQuestionHandler(questionData: QuestionSchema): Promise<void> {
        try {
            const questionModel = getModelForClass(QuestionSchema);
            const question = await questionModel.create(questionData);
            await question.save();
            console.log(`New question created with id (handler): ${question._id}`);
        } catch (error) {
            console.error("Question create error (handler):", error);
        }
    }

    public async updateQuestionHandler(questionId: string, updateData: {
        Question?: string,
        PossibleAnswers?: Map<string, string>,
        CorrectAnswer?: string,
        QuestionType?: string,
    }): Promise<void> {
        const questionModel = getModelForClass(QuestionSchema);
        try {
            const res = await questionModel.updateOne({ _id: questionId }, updateData);
            console.log(`Question updated with id (handler): ${questionId}`);
        } catch (error) {
            console.error("Question update error (handler):", error);
        }
    }

}

class DbInterface {
    private db: DbHandler = DbHandler.getInstance();

    public async createRoom(hostWsId: string, playerIds: Array<string>, roomState: string): Promise<void> {
        const roomRecord: RoomSchema = {
            HostWsId: hostWsId,
            PlayerIds: playerIds,
            RoomState: roomState,
        };

        try {
            await this.db.createRoom(roomRecord);
            console.log(`Room created (interface)`);
        } catch (error) {
            console.error("Failed to create room error (interface):", error);
        }
    }

    public async updateRoomState(roomId: string, newState: string) {
        const updateObject = { RoomState: newState };
        await this.db.updateRoom(roomId, updateObject);
    }

    public async updateRoomHostId(roomId: string, newHost: string) {
        const updateObject = { HostWsId: newHost };
        await this.db.updateRoom(roomId, updateObject);
    }

    public async updateRoomPlayerIds(roomId: string, playerIds: Array<string>) {
        const updateObject = { PlayerIds: playerIds };
        await this.db.updateRoom(roomId, updateObject);
    }

    public async createQuiz(questions: Array<string>): Promise<void> {
        const quizList: QuizSchema = {
            Questions: questions,
        };
        try {
            await this.db.createQuiz(quizList);
            console.log('Quiz created (interface)');
        } catch (error) {
            console.error("Failed to create quiz error (interface):", error);
        }
    }

    public async updateQuiz(quizId: string, newQuiz: Array<string>) {
        const updateObject = { Questions: newQuiz };
        await this.db.updateQuizList(quizId, updateObject);
    }

    public async createQuestion(question: string, possibleAnswers: Map<string, string>, correctAnswer: string, questionType: string) {
        const questionMetadata: QuestionSchema = {
            Question: question,
            PossibleAnswers: possibleAnswers,
            CorrectAnswer: correctAnswer,
            QuestionType: questionType,
        }

        try {
            await this.db.createQuestionHandler(questionMetadata);
            console.log('Question created (interface)');
        } catch (error) {
            console.error("Failed to create question (interface):", error);
        }
    }

    public async updateQuestionPrompt(questionId: string, newQuestion: string) {
        const updateObject = { Question: newQuestion };
        await this.db.updateQuestionHandler(questionId, updateObject);
    }

    public async updateQuestionAnswers(questionId: string, newAns: Map<string, string>) {
        const updateObject = { PossibleAnswers: newAns };
        await this.db.updateQuestionHandler(questionId, updateObject);
    }

    public async updateQuestionCorrect(questionId: string, newCorrect: string) {
        const updateObject = { CorrectAnswer: newCorrect };
        await this.db.updateQuestionHandler(questionId, updateObject);
    }

    public async updateQuestionType(questionId: string, questionType: string) {
        const updateObject = { QuestionType: questionType };
        await this.db.updateQuestionHandler(questionId, updateObject);
    }

}

export { DbHandler, DbInterface };
