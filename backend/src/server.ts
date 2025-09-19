// Imports
import { Server as SocketIOServer } from "socket.io";
import { connectDatabase } from "@/base/Database";
import { checkConfig } from "@/utils/config";
import { createServer } from "http";

import Logger from "@/base/Logger";
import express from "express";
import cors from "cors";

import "dotenv/config";

// Import routes
import searchRoutes from "@/routes/searchRoutes";
import authRoutes from "@/routes/authRoutes";
import downloadRoutes from "@/routes/downloadRoutes";
import downloadHistoryRoutes from "@/routes/downloadHistoryRoutes";
import metricsRoutes from "@/routes/metricsRoutes";

try {
	// Check Config
	Logger.info("Checking configuration...");
	await checkConfig();
	Logger.success("Configuration is valid");

	// Connect to MongoDB
	Logger.info("Connecting to MongoDB...");
	await connectDatabase();

	// Initialize Express
	const app = express();
	const httpServer = createServer(app);

	// Initialize Socket.IO
	const io = new SocketIOServer(httpServer, {
		cors: {
			origin: "*",
			methods: ["GET", "POST"]
		}
	});

	// Socket.IO connection handling
	io.on('connection', (socket) => {
		Logger.info(`Client connected: ${socket.id}`);

		socket.on('disconnect', () => {
			Logger.info(`Client disconnected: ${socket.id}`);
		});
	});

	// Socket.IO global variable
	global.io = io;

	// Middleware
	app.use(express.urlencoded({ extended: false }));
	app.use(express.json());
	app.use(cors({
		origin: "*",
		methods: ["GET", "POST", "PUT", "DELETE"],
		allowedHeaders: ["Content-Type", "Authorization"]
	}));

	// Rate limiting global

	// Routes
	app.use("/api/auth", authRoutes);
	app.use("/api", searchRoutes);
	app.use("/api/downloads", downloadRoutes);
	app.use("/api/download-history", downloadHistoryRoutes);
	app.use("/api/metrics", metricsRoutes);

	// Get port from environment or default to 3000
	const port = process.env.PORT || 3000;

	// Start the server
	Logger.info(`Starting server on port ${port}...`);
	httpServer.listen(port, () => {
		Logger.success(`✅ Server is running on port ${port}`);
	});

} catch (error: any) {
	console.log(error.stack);
	process.exit(1);
};