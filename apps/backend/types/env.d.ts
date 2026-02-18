declare global {
	namespace NodeJS {
		interface ProcessEnv {
			// Server
			PORT: string;

			// Database
			MONGODB_URL: string;

			// Environment
			NODE_ENV: "development" | "production";

			// JWT Secret
			JWT_SECRET: string;
		}
	}
}

export { };