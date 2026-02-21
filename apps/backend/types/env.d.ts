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

			// Discord (optionnel) — webhook pour notifications d'erreurs critiques
			DISCORD_WEBHOOK_URL?: string;
		}
	}
}

export { };