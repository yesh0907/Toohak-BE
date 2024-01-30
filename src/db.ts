import mongoose from "mongoose";
import * as dotenv from 'dotenv';

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