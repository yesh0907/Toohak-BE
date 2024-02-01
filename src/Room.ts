import mongoose from 'mongoose';

interface Room {
    room_id: string;
    host_ws_id: string;
    player_ids: Map<string, string>;
    room_state: 'active' | 'inactive' | 'unavailable';
}

const roomSchema = new mongoose.Schema<Room>({
    room_id: { type: String, required: true},
    host_ws_id: { type: String, required: true},
    player_ids: {
        type: Map,
        of: String
    },
    room_state: { type: String, required: true, enum: ['active', 'inactive', 'available']},
});

const RoomModel = mongoose.model<Room>('Room', roomSchema);

export { Room, RoomModel };