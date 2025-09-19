import { Server as SocketIOServer } from "socket.io";

// Extend global type to include io
declare global {
	var io: SocketIOServer;
}

export {};