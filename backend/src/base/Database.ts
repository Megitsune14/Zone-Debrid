// Imports
import { sleep } from '@/utils/functions';

import Logger from '@/base/Logger';
import mongoose from 'mongoose';

/**
 * Connect to MongoDB database with retry logic
 * Attempts connection up to 3 times with 10-second delays
 * @returns {Promise<void>} Resolves when connection is established
 * @throws {Error} When connection fails after 3 attempts
 */
export const connectDatabase = async (): Promise<void> => {

    let connected: boolean = false;
    let attempts: number = 0;

    while (!connected && attempts < 3) {
        try {

            await mongoose.connect(process.env.MONGODB_URL, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 20000,
            });

            connected = true;

        } catch (error: any) {
            attempts++;
            Logger.debug(`Error while connecting to the database, attempt ${attempts}/3... \n${error.message}`);
            await sleep(10000);
        };
    };

    if (!connected) throw new Error("Failed to connect to the database after 3 attempts.");
};