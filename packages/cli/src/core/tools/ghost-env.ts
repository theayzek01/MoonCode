import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Ghost Environment (Container Wizard)
 * Silently spins up Docker containers for missing dependencies (like Redis, Postgres)
 * to run code and tests seamlessly without manual environment setup.
 */
export class GhostEnvironment {
	private activeContainers: Map<string, string> = new Map();

	/**
	 * Checks if a dependency is installed locally. If not, spins up a Docker container.
	 */
	public async ensureDependency(imageName: string, ports: string[]): Promise<string> {
		if (this.activeContainers.has(imageName)) {
			return this.activeContainers.get(imageName)!;
		}

		try {
			// Check if docker is available
			await execAsync("docker --version");

			const portMappings = ports.map((p) => `-p ${p}`).join(" ");
			const containerName = `mooncli-ghost-${imageName.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}`;

			const cmd = `docker run -d --rm --name ${containerName} ${portMappings} ${imageName}`;
			const { stdout } = await execAsync(cmd);
			const containerId = stdout.trim();

			this.activeContainers.set(imageName, containerId);
			return containerId;
		} catch (error: any) {
			if (error.message.includes("docker --version")) {
				throw new Error("Ghost Environment failed: Docker is not installed or not running on the host system.");
			}
			throw new Error(`Ghost Environment failed to start ${imageName}: ${error.message}`);
		}
	}

	/**
	 * Executes a script inside the ghost container to verify it works.
	 */
	public async executeInContainer(containerId: string, command: string): Promise<string> {
		try {
			const { stdout } = await execAsync(`docker exec ${containerId} sh -c "${command}"`);
			return stdout.trim();
		} catch (error: any) {
			throw new Error(`Execution in Ghost Environment failed: ${error.message}`);
		}
	}

	/**
	 * Cleans up all ghost containers that were spun up during the session.
	 */
	public async cleanup(): Promise<void> {
		for (const [_image, containerId] of this.activeContainers.entries()) {
			try {
				await execAsync(`docker stop ${containerId}`);
			} catch (_e) {
				// Ignore cleanup errors
			}
		}
		this.activeContainers.clear();
	}
}
