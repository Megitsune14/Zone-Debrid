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
import { healthRoot } from "@/controllers/healthController";
import healthRoutes from "@/routes/healthRoutes";
import searchRoutes from "@/routes/searchRoutes";
import authRoutes from "@/routes/authRoutes";
import downloadRoutes from "@/routes/downloadRoutes";
import downloadHistoryRoutes from "@/routes/downloadHistoryRoutes";
import metricsRoutes from "@/routes/metricsRoutes";
import clientErrorRoutes from "@/routes/clientErrorRoutes";
import { notFoundHandler, errorHandler } from "@/middleware/errorHandler";
import { startAria2Polling } from "@/services/aria2PollingService";

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

	// Healthcheck global (racine)
	app.get("/", healthRoot);

	// Routes
	app.use("/api/health", healthRoutes);
	app.use("/api/auth", authRoutes);
	app.use("/api", searchRoutes);
	app.use("/api/downloads", downloadRoutes);
	app.use("/api/download-history", downloadHistoryRoutes);
	app.use("/api/metrics", metricsRoutes);
	app.use("/api/client-errors", clientErrorRoutes);

	// 404 puis gestionnaire d'erreurs global (doivent être en dernier)
	app.use(notFoundHandler);
	app.use(errorHandler);

	// Get port from environment or default to 3000
	const port = process.env.PORT || 3000;

	// Start the server
	Logger.info(`Starting server on port ${port}...`);
	httpServer.listen(port, () => {
		Logger.success(`✅ Server is running on port ${port}`);
		startAria2Polling();
	});

} catch (error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : undefined;
	Logger.error(`Startup failed: ${message}`);
	if (stack) Logger.error(stack);
	process.exit(1);
}