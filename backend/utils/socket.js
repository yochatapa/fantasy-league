import { Server } from 'socket.io';

let io = null;

export function setupSocket(server) {
    io = new Server(server, {
        cors: { origin: '*' }
    });

    io.on('connection', socket => {
        console.log('Client connected');
    });
}

export function getIO() {
    if (!io) throw new Error('Socket.IO not initialized');
    return io;
}
