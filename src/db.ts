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

class dbHandler {
    private static instance: dbHandler | null = null;
    
    private constructor() {
        this.connect().catch((error) => {
            console.error("Database connection error:", error);
            process.exit(1);
        });
    }

    public static getInstance(): dbHandler {
        if (!dbHandler.instance) {
            dbHandler.instance = new dbHandler();
        }
        return dbHandler.instance;
    }

    private async connect(): Promise<void> {
        await mongoose.connect(uri);
    }

    private async disconnect(): Promise<void> {
        await mongoose.disconnect();
    }

    public async createRoom(roomData: RoomSchema): Promise<void> {
        const roomModel = getModelForClass(RoomSchema);
        const room = new roomModel({ HostWsId: roomData.HostWsId, PlayerIds: roomData.PlayerIds, RoomState: roomData.RoomState});
        await room.save();
        console.log(`New room created with id: ${room._id}`);
    }

    public async updateRoomRecord(roomId: string, updateData: {
        RoomState?: string,
        PlayerIds?: string[],
        HostWsId?: string
    }): Promise<void> {
        const roomModel = getModelForClass(RoomSchema);  
        try {
            const res = await roomModel.updateOne({ _id: roomId }, updateData);
            console.log("Room updated");
        } catch (error) {
            console.error("error:", error);
        }
    }

    public async createQuiz(quizData: QuizSchema): Promise<void> {
        console.log("test3");
        const quizModel = getModelForClass(QuizSchema);
        console.log("test");
        const quiz = new quizModel({ Questions: quizData.Questions });
        await quiz.save();
        console.log(`New quiz created with id: ${quiz._id}`);
    }

    public async updateQuizList(quizId: string, updateData: {
        Questions?: string[],
    }): Promise<void> {
        const quizModel = getModelForClass(QuizSchema);
        try {
            const res = await quizModel.updateOne({ _id: quizId }, updateData);
            console.log("Quiz updated");
        } catch (error) {
            console.error("error:", error);
        }
    }

    public async createQuestionHandler(questionData: QuestionSchema): Promise<void> {
        const questionModel = getModelForClass(QuestionSchema);
        const question = new questionModel({ Question: questionData.Question, PossibleAnswers: questionData.PossibleAnswers, CorrectAnswer: questionData.CorrectAnswer, QuestionType: questionData.QuestionType});
        await question.save();
        console.log(`New question created with id: ${question._id}`);
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
            console.log("Question updated");
        } catch (error) {
            console.error("error", error);
        }
    }

}

class dbInterface {
    private db: dbHandler = dbHandler.getInstance();

    public async createRoomRecord(HostWsId: string, PlayerIds: Array<string>, RoomState: string): Promise<void> {
        const roomRecord: RoomSchema = {
            HostWsId,
            PlayerIds,
            RoomState,
        };

        try {
            await this.db.createRoom(roomRecord);
            console.log(`Room created`);
        } catch (error) {
            console.error("Failed to create room error:", error);
        }
    }

    public async updateRoomState(room_id: string, new_state: string) {
        const updateObject = { RoomState: new_state };
        await this.db.updateRoomRecord(room_id, updateObject);
    }

    public async updateRoomHostId(room_id: string, new_host: string) {
        const updateObject = { HostWsId: new_host };
        await this.db.updateRoomRecord(room_id, updateObject);
    }

    public async updateRoomPlayerIds(room_id: string, new_pid: Array<string>) {
        const updateObject = { PlayerIds: new_pid };
        await this.db.updateRoomRecord(room_id, updateObject);
    }

    public async createQuizList(Questions: Array<string>): Promise<void> {
        const quizList: QuizSchema = {
            Questions,
        };
        console.log("test2");
        try {
            await this.db.createQuiz(quizList);
            console.log('Quiz created');
        } catch (error) {
            console.error("Failed to create quiz error:", error);
        }
    }

    public async updateQuiz(quizId: string, newQuiz: Array<string>) {
        const updateObject = { Questions: newQuiz };
        await this.db.updateQuizList(quizId, updateObject);
    }

    public async createQuestion(Question: string, PossibleAnswers: Map<string, string>, CorrectAnswer: string, QuestionType: string) {
        const questionMetadata: QuestionSchema = {
            Question,
            PossibleAnswers,
            CorrectAnswer,
            QuestionType,
        }

        try {
            await this.db.createQuestionHandler(questionMetadata);
            console.log('Question created');
        } catch (error) {
            console.error("Failed to create question:", error);
        }
    }

    public async updateQuestion(questionId: string, newQuestion: string) {
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

export { dbHandler, dbInterface };
