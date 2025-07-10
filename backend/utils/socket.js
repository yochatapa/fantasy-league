import { Server } from 'socket.io';

let io = null;

export function setupSocket(server) {
    io = new Server(server, {
        cors: { origin: '*' }
    });

    io.on('connection', socket => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('joinRoom', (room) => {
            console.log(`Socket ${socket.id} joining room: ${room}`);
            socket.join(room);
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
