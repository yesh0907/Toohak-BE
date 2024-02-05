import mongoose from "mongoose";
import * as dotenv from 'dotenv';
import { RoomSchema, QuizSchema, QuestionSchema } from './database/schema';
import { modelOptions, prop, PropType, getModelForClass } from "@typegoose/typegoose";

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
        const roomModel = getModelForClass(RoomSchema)
        const room = new roomModel({ HostWsId: roomData.HostWsId, PlayerIds: roomData.PlayerIds, RoomState: roomData.RoomState});
        await room.save();
        console.log(`New room created with id: ${room._id}`);
    }

    public async updateRoomRecord(room_id: string, updateData: {
        RoomState?: string,
        PlayerIds?: string[],
        HostWsId?: string
    }): Promise<void> {
        const roomModel = getModelForClass(RoomSchema);  
        try {
            const res = await roomModel.updateOne({ _id: room_id }, updateData);
            console.log("Room updated");
        } catch (error) {
            console.error("error:", error);
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
            this.db.createRoom(roomRecord);
            console.log(`Room created}`);
        } catch (error) {
            console.error("Failed to create room error:", error);
        }
    }

    public async updateRoomState(room_id: string, new_state: string) {
        const updateObject = { RoomState: new_state};
        await this.db.updateRoomRecord(room_id, updateObject);
    }

    public async updateRoomHostId(room_id: string, new_host: string) {
        const updateObject = { HostWsId: new_host};
        await this.db.updateRoomRecord(room_id, updateObject);
    }

    public async updateRoomPlayerIds(room_id: string, new_pid: Array<string>) {
        const updateObject = { PlayerIds: new_pid};
        await this.db.updateRoomRecord(room_id, updateObject);
    }

}

export { dbHandler, dbInterface };
