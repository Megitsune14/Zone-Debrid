// Import
import chalk from "chalk";

// Export
export default class Logger {

	static info(content: string) {
		console.log(`${chalk.magenta("{Zone-Debrid}")} ${content}`);
	};

	static success(content: string) {
		console.log(`${chalk.green("{Zone-Debrid}")} ${content}`);
	};

	static error(content: string) {
		console.log(`${chalk.red("{Zone-Debrid}")} ${content}`);
	};

	static debug(content: string) {
		console.log(`${chalk.yellow("{Zone-Debrid}")} ${content}`);
	};

	static separator() {
		console.log(chalk.black("=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="));
	};
};