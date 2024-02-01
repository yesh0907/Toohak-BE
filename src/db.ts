import mongoose from "mongoose";
import * as dotenv from 'dotenv';
import { Room, RoomModel } from './Room';

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
        await mongoose.disconnect();
    }
}

export const dbConnect = async () => {
    await run().catch(console.dir);
}

class dbHandler {
    private uri: string = process.env.MONGO_URI ?? 'mongodb://localhost:27017/myapp';
    private static instance: dbHandler | null = null;
    
    private constructor() {
        this.connect().catch((error) => {
            console.error("Database connection error:", error);
            process.exit(1); // Exit if cannot connect to the database
        });
    }

    public static getInstance(): dbHandler {
        if (!dbHandler.instance) {
            dbHandler.instance = new dbHandler();
        }
        return dbHandler.instance;
    }

    public async connect(): Promise<void> {
        await mongoose.connect(this.uri);
    }

    public async createRoom(roomData: Room): Promise<void> {
        const room = new RoomModel(roomData);
        await room.save();
        console.log(`New room created with id: ${room._id}`);
    }

    public async updateRoom(roomID: string, updateData: Partial<Room>): Promise<void> {
        const res = await RoomModel.updateOne({ room_id: roomID }, { $set: updateData });
        if (res.modifiedCount === 0) {
            console.log("Room unchanged");
        } else {
            console.log(`Room with id ${roomID} updated (if exists)`);
        }
    }
}

class dbInterface {
    private db: dbHandler = dbHandler.getInstance();

    public async createRoomRecord(room_id: string, host_ws_id: string, player_ids: Map<string, string>, room_state: Room['room_state']): Promise<void> {
        const roomRecord: Room = {
            room_id,
            host_ws_id,
            player_ids,
            room_state,
        };

        await this.db.createRoom(roomRecord).then(() => {
            console.log("Room record created");
        }).catch((error) => {
            console.error("Failed to create room rec:", error);
        });
    }

    public async updateRoomRecord(room_id: string, updateData: Partial<Room>): Promise<void> {
        await this.db.updateRoom(room_id, updateData).then(() => {
            console.log(`Room record with id ${room_id} updated successfully.`);
        }).catch((error) => {
            console.error(`Failed to update room record with id ${room_id}:`, error);
        });
    }
}

export { dbHandler, dbInterface };
