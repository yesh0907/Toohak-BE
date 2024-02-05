import mongoose from "mongoose";
import * as dotenv from 'dotenv';
import { RoomSchema, QuizSchema, QuestionSchema } from './database/schema';
import { modelOptions, prop, PropType, getModelForClass } from "@typegoose/typegoose";

// get env variables
dotenv.config();

if (process.env.MONGO_URI === undefined) {
    console.error('env variable MONG_URI is not set in .env file');
    // exit program
    process.exit(1);
}

const uri = process.env.MONGO_URI;

async function run() {
    try {
        await mongoose.connect(uri);
        await mongoose.connection.db.admin().command({ ping: 1 });
        console.log("successfully connected to DB");
    } finally {
        // await mongoose.disconnect();
    }
}

export const dbConnect = async () => {
    await run().catch(console.dir);
}

class dbHandler {
    private static instance: dbHandler | null = null;
    
    // private constructor() {
    //     dbConnect();
    //     // this.connect().catch((error) => {
    //     //     console.error("Database connection error:", error);
    //     //     process.exit(1);
    //     // });
    // }

    public static getInstance(): dbHandler {
        if (!dbHandler.instance) {
            dbHandler.instance = new dbHandler();
        }
        return dbHandler.instance;
    }

    private async connect(): Promise<void> {
        await mongoose.connect(uri);
    }

    public async createRoom(roomData: RoomSchema): Promise<void> {
        await dbConnect();
        const roomModel = getModelForClass(RoomSchema)
        const room = new roomModel({ HostWsId: roomData.HostWsId, PlayerIds: roomData.PlayerIds, RoomState: roomData.RoomState});
        await room.save();
        console.log(`New room created with id: ${room._id}`);
    }

    public async updateRoomRecord(room_id: string, updateData: any): Promise<void> {
        //const mongoose = require('mongoose');
        await dbConnect();
        const roomModel = getModelForClass(RoomSchema)
        var objectId = new mongoose.Types.ObjectId(room_id);
        let updating = "string";
        if (Array.isArray(updateData)) {
            updating = "PlayerIds";
        } else if (updateData === 'active' || updateData === 'inactive' || updateData === 'unavailable') {
            updating = "RoomState";
        } else {
            updating = "HostWsId";
        }
        console.log(objectId.toString());
        const updateObject = { [updating]: updateData};
        
        try {
            const res = await roomModel.updateOne({ _id: objectId }, updateObject);
            console.log(res);
        } catch (error) {
            console.error("error:", error);
        }
        console.log(updateObject);
        
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

        await this.db.createRoom(roomRecord).then(() => {
            console.log("Room record created");
        }).catch((error) => {
            console.error("Failed to create room rec:", error);
        });
    }

    public async updateRoomState(room_id: string, new_state: string) {
        await this.db.updateRoomRecord(room_id, new_state);
    }

    public async updateRoomHostId(room_id: string, new_host: string) {
        await this.db.updateRoomRecord(room_id, new_host);
    }

    public async updateRoomPlayerIds(room_id: string, new_pid: Array<string>) {
        await this.db.updateRoomRecord(room_id, new_pid);
    }

}

export { dbHandler, dbInterface };
