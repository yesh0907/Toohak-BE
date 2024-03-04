import mongoose from "mongoose";
import * as dotenv from 'dotenv';
import { RoomSchema, QuizSchema, QuestionSchema } from './schema';
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
    }

    private async disconnect(): Promise<void> {
        await mongoose.disconnect();
    }

    public async createRoom(roomData: RoomSchema): Promise<string | null> {
        try {
            const roomModel = getModelForClass(RoomSchema);
            const room = await roomModel.create(roomData);
            console.log(`New room created with id: ${room._id}, collection: ${roomModel.collection.collectionName}`);
            return room._id.toString();
        } catch (error) {
            console.error(`Room creation error:`, error);
            return null;
        }
    }

    public async getRoom(roomId: string): Promise<RoomSchema | null> {
        try {
            const roomModel = getModelForClass(RoomSchema);
            const room = await roomModel.findById(roomId);
            console.log(`Returning quiz: ${roomId}`)
            return room;
          } catch (error) {
            console.error(`Error retrieving room by ID (${roomId}):`, error);
            return null;
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
            console.log(`Room successfully updated with id: ${roomId}, collection: ${roomModel.collection.collectionName}, updated fields: ${Object.keys(updateData).join(', ')}`);
        } catch (error) {
            console.error(`Failed to update room fields: ${Object.keys(updateData).join(', ')}, with id: ${roomId}, collection: ${roomModel.collection.collectionName}, error:`, error);
        }
    }

    public async createQuiz(quizData: QuizSchema): Promise<void> {
        try {
            const quizModel = getModelForClass(QuizSchema);
            const quiz = await quizModel.create(quizData);
            console.log(`New quiz created with id: ${quiz._id}, collection: ${quizModel.collection.collectionName}`);
        } catch (error) {
            console.error(`Quiz creation error:`, error);
        }
    }

    public async getQuiz(quizId: string): Promise<QuizSchema | null> {
        try {
            const quizModel = getModelForClass(QuizSchema);
            const quiz = await quizModel.findById(quizId);
            console.log(`Returning quiz: ${quizId}`)
            return quiz;
          } catch (error) {
            console.error(`Error retrieving quiz by ID (${quizId}):`, error);
            return null;
          }
    }

    public async updateQuizQuestionIds(quizId: string, updateData: {
        Questions?: Array<string>,
    }): Promise<void> {
        const quizModel = getModelForClass(QuizSchema);
        try {
            const res = await quizModel.updateOne({ _id: quizId }, updateData);
            console.log(`Quiz successfully updated with id: ${quizId}, collection: ${quizModel.collection.collectionName}, updated fields: ${Object.keys(updateData).join(', ')}`);
        } catch (error) {
            console.error(`Failed to update quiz fields: ${Object.keys(updateData).join(', ')}, with id: ${quizId}, collection: ${quizModel.collection.collectionName}, error:`, error);
        }
    }

    public async createQuestion(questionData: QuestionSchema): Promise<string | null> {
        try {
            const questionModel = getModelForClass(QuestionSchema);
            const question = await questionModel.create(questionData);
            console.log(`New question created with id: ${question._id}, collection: ${questionModel.collection.collectionName}`);
            return question._id.toString();
        } catch (error) {
            console.error(`Question creation error:`, error);
            return null;
        }
    }

    public async getQuestion(questionId: string) : Promise<QuestionSchema | null> {
        try {
            const questionModel = getModelForClass(QuestionSchema);
            const question = questionModel.findById(questionId);
            console.log(`Returning question: ${questionId}`);
            return  question;
        } catch (error) {
            console.error(`Error retrieving question by ID (${questionId}):`, error);
            return null;
        }
    }

    public async updateQuestion(questionId: string, updateData: {
        Question?: string,
        PossibleAnswers?: Map<string, string>,
        CorrectAnswer?: string,
        QuestionType?: string,
    }): Promise<void> {
        const questionModel = getModelForClass(QuestionSchema);
        try {
            const res = await questionModel.updateOne({ _id: questionId }, updateData);
            console.log(`Question successfully updated with id: ${questionId}, collection: ${questionModel.collection.collectionName}, updated fields: ${Object.keys(updateData).join(', ')}`);
        } catch (error) {
            console.error(`Failed to update question fields: ${Object.keys(updateData).join(', ')}, with id ${questionId}, collection: ${questionModel.collection.collectionName}, error:`, error);
        }
    }

}

class DbInterface {
    private db: DbHandler;
    
    constructor() {
        this.db = DbHandler.getInstance();
    }

    public async createRoom(hostWsId: string): Promise<string | null> {
        const playerIds = Array<string>();
        const roomState = 'INACTIVE';
        const roomRecord: RoomSchema = {
            HostWsId: hostWsId,
            PlayerIds: playerIds,
            RoomState: roomState,
        };

        try {
            const id = await this.db.createRoom(roomRecord);
            console.log(`Room successfully created with HostWsId: ${hostWsId}, Player Ids: ${playerIds}, Room State: ${roomState}`);
            return id;
        } catch (error) {
            console.error("Failed to create room, error:", error);
            return null;
        }
    }

    public async getRoom(roomId: string): Promise<RoomSchema | null> {
        try {
            const room = await this.db.getRoom(roomId);
            return room;
        } catch (error) {
            console.log(`Failed to retrieve room: ${roomId}, error: ${error}`);
            return null;
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

    public async appendPlayerIdToRoom(roomId: string, playerId: string) {
        try {
            const room = await this.getRoom(roomId);
            if (room == null) {
                throw new Error("Room does not exist");
            }
            const playerIds = room.PlayerIds;
            // append playerId to exisitng array of playerIds
            await this.db.updateRoom(roomId, { PlayerIds: [...playerIds, playerId] });
        } catch (e) {
            console.error(`appendPlayerIdToRoom error: ${e}`);
        }
    }

    public async updateRoomPlayerIds(roomId: string, playerIds: Array<string>) {
        const updateObject = { PlayerIds: playerIds };
        await this.db.updateRoom(roomId, updateObject);
    }

    public async createQuiz(questionIds: Array<string>): Promise<void> {
        const quizList: QuizSchema = {
            Questions: questionIds,
        };
        try {
            await this.db.createQuiz(quizList);
            console.log(`Quiz successfully created with Question Id List: ${questionIds}`);
        } catch (error) {
            console.error("Failed to create quiz, error:", error);
        }
    }

    public async getQuiz(quizId: string): Promise<QuizSchema | null> {
        try {
            const quiz = await this.db.getQuiz(quizId);
            return quiz;
        } catch (error) {
            console.log(`Failed to retrieve quiz: ${quizId}, error: ${error}`);
            return null;
        }
    }

    public async updateQuizQuestionIds(quizId: string, newQuizQuestionIds: Array<string>) {
        const updateObject = { Questions: newQuizQuestionIds };
        await this.db.updateQuizQuestionIds(quizId, updateObject);
    }

    public async createQuestion(question: string, possibleAnswers: Map<string, string>, correctAnswer: string, questionType: string) {
        const possibleAnswersMap = new Map(Object.entries(possibleAnswers));
        const questionMetadata: QuestionSchema = {
            Question: question,
            PossibleAnswers: possibleAnswersMap,
            CorrectAnswer: correctAnswer,
            QuestionType: questionType,
        }

        try {
            const questionId = await this.db.createQuestion(questionMetadata);
            console.log(`Question successfully created with Prompt: ${question}, Possible Answers: ${Array.from(possibleAnswersMap.values())}, Correct Answer: ${correctAnswer}, Question Type: ${questionType}`);
            return questionId;
        } catch (error) {
            console.error("Failed to create question, error:", error);
            return null;
        }
    }

    public async getQuestion(questionId: string) : Promise<QuestionSchema | null> {
        try {
            const question = await this.db.getQuestion(questionId);
            return question;
        } catch (error) {
            console.error(`Error retrieving question by ID (${questionId}):`, error);
            return null;
        }
    }

    public async updateQuestionPrompt(questionId: string, newQuestion: string) {
        const updateObject = { Question: newQuestion };
        await this.db.updateQuestion(questionId, updateObject);
    }

    public async updateQuestionAnswers(questionId: string, newAns: Map<string, string>) {
        const updateObject = { PossibleAnswers: newAns };
        await this.db.updateQuestion(questionId, updateObject);
    }

    public async updateQuestionCorrect(questionId: string, newCorrect: string) {
        const updateObject = { CorrectAnswer: newCorrect };
        await this.db.updateQuestion(questionId, updateObject);
    }

    public async updateQuestionType(questionId: string, questionType: string) {
        const updateObject = { QuestionType: questionType };
        await this.db.updateQuestion(questionId, updateObject);
    }

}

export { DbHandler, DbInterface };