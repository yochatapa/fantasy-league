import { Server } from 'socket.io';
import activeDraftRooms from './draft/activeDraftRooms.js';  // draftRoom 위치에 맞게 경로 수정

let io = null;

export function setupSocket(server) {
    io = new Server(server, {
        cors: { origin: '*' }
    });

    io.on('connection', socket => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('joinRoom', (room, option = {}) => {
            if (typeof room === 'string' && room.trim().length > 0) {
                console.log(`Socket ${socket.id} joining room: ${room}`);
                socket.join(room);

                if (typeof option === 'object' && option !== null) {
                    for (const [key, value] of Object.entries(option)) {
                        socket[key] = value;
                        console.log(`Set socket.${key} =`, value);
                    }
                }
            } else {
                console.warn(`Invalid room name for joinRoom: ${room}`);
            }
        });

        socket.on('joinDraftRoom', (room, option = {}) => {
            if (typeof room === 'string' && room.trim().length > 0) {
                console.log(`Socket ${socket.id} joining draft room: ${room}`);
                socket.join(room);

                if (typeof option === 'object' && option !== null) {
                    for (const [key, value] of Object.entries(option)) {
                        socket[key] = value;
                        console.log(`Set socket.${key} =`, value);
                    }

                    if(socket.leagueId && socket.seasonId){
                        const roomKey = `${socket.leagueId}_${socket.seasonId}`;
                        if(activeDraftRooms.has(roomKey)){
                            activeDraftRooms.get(roomKey).broadcastUpdate()
                        }
                    }
                }
            } else {
                console.warn(`Invalid room name for joinRoom: ${room}`);
            }
        });

        socket.on('leaveRoom', (room) => {
            console.log(`Socket ${socket.id} leaving room: ${room}`);
            socket.leave(room);
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}

export function getIO() {
    if (!io) throw new Error('Socket.IO not initialized');
    return io;
}
