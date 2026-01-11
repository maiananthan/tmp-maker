import { App, PluginSettingTab, Setting } from "obsidian";
import TmpMakerPlugin from "./main";

export interface TmpMakerSettings {
	/** Folder path where temp notes are stored */
	tmpFolder: string;
	/** Number of days after which old notes are deleted */
	retentionDays: number;
	/** Enable auto-cleanup on startup */
	autoCleanup: boolean;
}

export const DEFAULT_SETTINGS: TmpMakerSettings = {
	tmpFolder: "tmp",
	retentionDays: 14,
	autoCleanup: true,
};

export class TmpMakerSettingTab extends PluginSettingTab {
	plugin: TmpMakerPlugin;

	constructor(app: App, plugin: TmpMakerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Temp folder")
			.setDesc("Folder path where temporary notes will be created")
			.addText((text) =>
				text
					.setPlaceholder("Tmp")
					.setValue(this.plugin.settings.tmpFolder)
					.onChange(async (value) => {
						this.plugin.settings.tmpFolder = value || "tmp";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Retention days")
			.setDesc("Delete temp notes older than this many days (0 to disable)")
			.addText((text) =>
				text
					.setPlaceholder("14")
					.setValue(String(this.plugin.settings.retentionDays))
					.onChange(async (value) => {
						const days = Number.parseInt(value, 10);
						this.plugin.settings.retentionDays = Number.isNaN(days) || days < 0 ? 14 : days;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-cleanup on startup")
			.setDesc("Automatically delete old temp notes when Obsidian opens")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoCleanup)
					.onChange(async (value) => {
						this.plugin.settings.autoCleanup = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
