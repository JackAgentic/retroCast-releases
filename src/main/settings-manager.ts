import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { AppSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

export class SettingsManager {
  private filePath: string;
  private settings: AppSettings;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'settings.json');
    this.settings = this.load();
  }

  private load(): AppSettings {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    return { ...DEFAULT_SETTINGS };
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  save(newSettings: AppSettings): void {
    this.settings = { ...newSettings };
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  updateVolume(level: number): void {
    this.settings.persistentVolume = level;
    this.save(this.settings);
  }
}
