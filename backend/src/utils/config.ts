// Imports
import { z } from "zod";

import mongoose from "mongoose";
import fs from "fs/promises";
import dotenv from "dotenv";
import path from "path";

/**
 * Generate Zod schema for environment variables validation
 * @returns {Promise<z.ZodObject<any, any>>} Zod schema object for environment validation
 */
const generateEnvSchema = async (): Promise<z.ZodObject<any, any>> => {
	const envPath = path.resolve(process.cwd(), '.env');
	const envConfig = dotenv.parse(await fs.readFile(envPath));
	const schemaShape: Record<string, z.ZodTypeAny> = {};

	const envKeys = Object.keys(envConfig).filter(key => !key.startsWith('_'));

	for (const key of envKeys) {
		if (key === 'NODE_ENV') {
			schemaShape[key] = z.enum(['development', 'production'] as const, {
				required_error: "NODE_ENV must be either 'development' or 'production'",
				invalid_type_error: "NODE_ENV must be either 'development' or 'production'"
			});
			continue;
		}

		schemaShape[key] = z.string().min(1, `${key} must be at least 1 character long`);
	}

	const optionalFields = [''];
	for (const field of optionalFields) {
		if (field in schemaShape) {
			schemaShape[field] = z.string();
		}
	}

	return z.object(schemaShape);
};

type EnvConfig = z.infer<Awaited<ReturnType<typeof generateEnvSchema>>>;

/**
 * Check and validate application configuration
 * Validates environment variables, database connection, and build requirements
 * @returns {Promise<void>} Resolves when configuration is valid
 * @throws {Error} When configuration validation fails
 */
export const checkConfig = async (): Promise<void> => {
	try {
		const envSchema = await generateEnvSchema();
		let envParse: EnvConfig;

		try {
			envParse = envSchema.parse(process.env);
		} catch (error) {
			if (error instanceof z.ZodError) {
				const issues = error.issues.map(issue => `- ${issue.path.join('.')}: ${issue.message}`).join('\n');
				throw new Error(`Environment validation failed:\n${issues}`);
			}
			throw error;
		}

		await mongoose.connect(envParse.MONGODB_URL);

		const npmScript = process.env.npm_lifecycle_event;
		
		if (!npmScript) {
			throw new Error("This application must be started using an npm script (npm run dev or npm run start)");
		}

		if (envParse.NODE_ENV === "production") {
			const files = await fs.readdir("./dist");

			if (files.length === 0) {
				throw new Error("No files found in the dist folder. Please run 'npm run build' first.");
			}

			if (npmScript !== 'start') {
				throw new Error("In production mode, you must use 'npm run start' to run the compiled code.");
			}
		} else if (envParse.NODE_ENV === "development") {
			if (npmScript !== 'dev') {
				throw new Error("In development mode, you must use 'npm run dev' to run the TypeScript code directly.");
			}
		}

		if (mongoose.connection.readyState === 1) {
			await mongoose.disconnect();
		}
	} catch (error: any) {
		throw error instanceof Error ? error : new Error(error);
	}
};