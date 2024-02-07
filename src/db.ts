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

    private dbName?: string;
    
    private constructor() {
        try {
            this.connect();
            console.log(`Successful connection to database`);
        } catch (error) {
            console.error(`Database connection error:`, error);
        };
    }

    public static getInstance(): DbHandler {
        if (!DbHandler.instance) {
            DbHandler.instance = new DbHandler();
        }
        return DbHandler.instance;
    }

    private async connect(): Promise<void> {
        const connection = await mongoose.connect(uri);
        this.dbName = connection.connection.db.databaseName;
    }

    private async disconnect(): Promise<void> {
        await mongoose.disconnect();
    }

    public async createRoom(roomData: RoomSchema): Promise<void> {
        try {
            const roomModel = getModelForClass(RoomSchema);
            const room = await roomModel.create(roomData);
            console.log(`New room created with id: ${room._id}, database: ${this.dbName}, collection: ${roomModel.collection.collectionName}`);
        } catch (error) {
            console.error(`Room creation error in database: ${this.dbName}:`, error);
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
            console.log(`Room successfully updated with id: ${roomId}, database: ${this.dbName}, collection: ${roomModel.collection.collectionName}, updated fields: ${Object.keys(updateData).join(', ')}`);
        } catch (error) {
            console.error(`Failed to update room fields: ${Object.keys(updateData).join(', ')}, with id: ${roomId}, database: ${this.dbName}, collection: ${roomModel.collection.collectionName}, error:`, error);
        }
    }

    public async createQuizQuestionIds(quizData: QuizSchema): Promise<void> {
        try {
            const quizModel = getModelForClass(QuizSchema);
            const quiz = await quizModel.create(quizData);
            console.log(`New quiz created with id: ${quiz._id}, database: ${this.dbName}, collection: ${quizModel.collection.collectionName}`);
        } catch (error) {
            console.error(`Quiz creation error in database: ${this.dbName}:`, error);
        }
    }

    public async updateQuizQuestionIds(quizId: string, updateData: {
        Questions?: Array<string>,
    }): Promise<void> {
        const quizModel = getModelForClass(QuizSchema);
        try {
            const res = await quizModel.updateOne({ _id: quizId }, updateData);
            console.log(`Quiz successfully updated with id: ${quizId}, database: ${this.dbName}, collection: ${quizModel.collection.collectionName}, updated fields: ${Object.keys(updateData).join(', ')}`);
        } catch (error) {
            console.error(`Failed to update quiz fields: ${Object.keys(updateData).join(', ')}, with id: ${quizId}, database: ${this.dbName}, collection: ${quizModel.collection.collectionName}, error:`, error);
        }
    }

    public async createQuestionHandler(questionData: QuestionSchema): Promise<void> {
        try {
            const questionModel = getModelForClass(QuestionSchema);
            const question = await questionModel.create(questionData);
            console.log(`New question created with id: ${question._id}, database: ${this.dbName}, collection: ${questionModel.collection.collectionName}`);
        } catch (error) {
            console.error(`Question creation error in database: ${this.dbName}:`, error);
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
            console.log(`Question successfully updated with id: ${questionId}, database: ${this.dbName}, collection: ${questionModel.collection.collectionName}, updated fields: ${Object.keys(updateData).join(', ')}`);
        } catch (error) {
            console.error(`Failed to update question fields: ${Object.keys(updateData).join(', ')}, with id ${questionId}, database: ${this.dbName}, collection: ${questionModel.collection.collectionName}, error:`, error);
        }
    }

}

class DbInterface {
    private db: DbHandler;
    
    constructor() {
        this.db = DbHandler.getInstance();
    }

    public async createRoom(hostWsId: string, playerIds: Array<string>, roomState: string): Promise<void> {
        const roomRecord: RoomSchema = {
            HostWsId: hostWsId,
            PlayerIds: playerIds,
            RoomState: roomState,
        };

        try {
            await this.db.createRoom(roomRecord);
            console.log(`Room successfully created with HostWsId: ${hostWsId}, Player Ids: ${playerIds}, Room State: ${roomState}`);
        } catch (error) {
            console.error("Failed to create room, error:", error);
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

    public async createQuizQuestionIds(questionIds: Array<string>): Promise<void> {
        const quizList: QuizSchema = {
            Questions: questionIds,
        };
        try {
            await this.db.createQuizQuestionIds(quizList);
            console.log(`Quiz successfully created with Question Id List: ${questionIds}`);
        } catch (error) {
            console.error("Failed to create quiz, error:", error);
        }
    }

    public async updateQuizQuestionIds(quizId: string, newQuizQuestionIds: Array<string>) {
        const updateObject = { Questions: newQuizQuestionIds };
        await this.db.updateQuizQuestionIds(quizId, updateObject);
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
            console.log(`Question successfully created with Prompt: ${question}, Possible Answers: ${Array.from(possibleAnswers.keys())}, Correct Answer: ${correctAnswer}, Question Type: ${questionType}`);
        } catch (error) {
            console.error("Failed to create question, error:", error);
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