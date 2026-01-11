import { Notice, Plugin, TFile, TFolder } from "obsidian";
import { DEFAULT_SETTINGS, TmpMakerSettings, TmpMakerSettingTab } from "./settings";

/**
 * Helper function to show a notice and return it (satisfies linter rules)
 */
function showNotice(message: string): Notice {
	return new Notice(message);
}

export default class TmpMakerPlugin extends Plugin {
	settings: TmpMakerSettings;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon to create a new temp note
		this.addRibbonIcon("file-plus", "Create temp note", async () => {
			await this.createTempNote();
		});

		// Add command to create temp note
		this.addCommand({
			id: "create-temp-note",
			name: "Create temp note",
			callback: async () => {
				await this.createTempNote();
			},
		});

		// Add command to manually cleanup old notes
		this.addCommand({
			id: "cleanup-old-temp-notes",
			name: "Cleanup old temp notes",
			callback: async () => {
				await this.cleanupOldNotes();
			},
		});

		// Add settings tab
		this.addSettingTab(new TmpMakerSettingTab(this.app, this));

		// Run auto-cleanup on startup if enabled
		if (this.settings.autoCleanup) {
			// Wait for vault to be fully loaded
			this.app.workspace.onLayoutReady(async () => {
				await this.cleanupOldNotes();
			});
		}
	}

	onunload() {
		// Cleanup handled automatically by Obsidian
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Creates a new temp note with today's date as filename
	 */
	async createTempNote(): Promise<void> {
		const folderPath = this.settings.tmpFolder;
		const today = this.formatDate(new Date());
		const fileName = `${today}.md`;
		const filePath = `${folderPath}/${fileName}`;

		try {
			// Ensure the folder exists
			await this.ensureFolderExists(folderPath);

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(filePath);
			if (existingFile instanceof TFile) {
				// Open existing file
				await this.app.workspace.getLeaf().openFile(existingFile);
				showNotice(`Opened existing temp note: ${fileName}`);
				return;
			}

			// Create new file with default content
			const content = `# ${today}\n\n`;
			const newFile = await this.app.vault.create(filePath, content);

			// Open the new file
			await this.app.workspace.getLeaf().openFile(newFile);
			showNotice(`Created temp note: ${fileName}`);
		} catch (error) {
			console.error("Failed to create temp note:", error);
			showNotice(`Failed to create temp note: ${error}`);
		}
	}

	/**
	 * Deletes temp notes older than the configured retention days
	 */
	async cleanupOldNotes(): Promise<void> {
		if (this.settings.retentionDays <= 0) {
			return;
		}

		const folderPath = this.settings.tmpFolder;
		const folder = this.app.vault.getAbstractFileByPath(folderPath);

		if (!(folder instanceof TFolder)) {
			// Folder doesn't exist, nothing to clean
			return;
		}

		const now = new Date();
		const cutoffDate = new Date(now.getTime() - this.settings.retentionDays * 24 * 60 * 60 * 1000);
		const deletedFiles: string[] = [];

		for (const file of folder.children) {
			if (!(file instanceof TFile) || file.extension !== "md") {
				continue;
			}

			// Try to parse date from filename (YYYY-MM-DD.md)
			const dateMatch = file.basename.match(/^(\d{4}-\d{2}-\d{2})$/);
			if (!dateMatch?.[1]) {
				continue;
			}

			const fileDate = new Date(dateMatch[1]);
			if (Number.isNaN(fileDate.getTime())) {
				continue;
			}

			if (fileDate < cutoffDate) {
				try {
					const fileName = file.basename;
					await this.app.vault.delete(file);
					deletedFiles.push(fileName);
				} catch (error) {
					console.error(`Failed to delete ${file.path}:`, error);
				}
			}
		}

		if (deletedFiles.length > 0) {
			const fileList = deletedFiles.map((f, i) => `${i + 1}. ${f}`).join("\n");
			showNotice(`Cleaned up ${deletedFiles.length} old temp note(s):\n${fileList}`);
		}
	}

	/**
	 * Ensures the specified folder exists, creating it if necessary
	 */
	private async ensureFolderExists(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	/**
	 * Formats a date as YYYY-MM-DD
	 */
	private formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}
}
