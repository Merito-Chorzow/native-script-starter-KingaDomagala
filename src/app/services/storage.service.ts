import { Injectable } from '@angular/core';
import { ApplicationSettings } from '@nativescript/core';
import { Product } from '../models/product.model';

export interface AppSettings {
  offlineMode: boolean;
  darkMode: boolean;
  autoSync: boolean;
  language: string;
  scanSoundEnabled: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  offlineMode: false,
  darkMode: false,
  autoSync: true,
  language: 'pl',
  scanSoundEnabled: true,
  vibrationEnabled: true,
};

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly PRODUCTS_KEY = 'scan_inventory_products';
  private readonly SETTINGS_KEY = 'scan_inventory_settings';
  private readonly LAST_SYNC_KEY = 'scan_inventory_last_sync';

  constructor() {}

  // ============= PRODUCTS STORAGE =============

  /**
   * Zapisuje listę produktów do lokalnego storage
   */
  saveProducts(products: Product[]): void {
    try {
      const jsonString = JSON.stringify(products);
      ApplicationSettings.setString(this.PRODUCTS_KEY, jsonString);
    } catch (error) {
      console.error('Error saving products:', error);
    }
  }

  /**
   * Pobiera listę produktów z lokalnego storage
   */
  getProducts(): Product[] {
    try {
      const jsonString = ApplicationSettings.getString(this.PRODUCTS_KEY);
      if (jsonString) {
        const products = JSON.parse(jsonString) as Product[];
        // Konwersja stringów dat na obiekty Date
        return products.map((p) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }));
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
    return [];
  }

  /**
   * Usuwa wszystkie produkty z lokalnego storage
   */
  clearProducts(): void {
    ApplicationSettings.remove(this.PRODUCTS_KEY);
  }

  // ============= SETTINGS STORAGE =============

  /**
   * Zapisuje ustawienia aplikacji
   */
  saveSettings(settings: AppSettings): void {
    try {
      const jsonString = JSON.stringify(settings);
      ApplicationSettings.setString(this.SETTINGS_KEY, jsonString);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Pobiera ustawienia aplikacji
   */
  getSettings(): AppSettings {
    try {
      const jsonString = ApplicationSettings.getString(this.SETTINGS_KEY);
      if (jsonString) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(jsonString) };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Aktualizuje pojedyncze ustawienie
   */
  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const currentSettings = this.getSettings();
    currentSettings[key] = value;
    this.saveSettings(currentSettings);
  }

  /**
   * Resetuje ustawienia do wartości domyślnych
   */
  resetSettings(): void {
    this.saveSettings(DEFAULT_SETTINGS);
  }

  // ============= SYNC MANAGEMENT =============

  /**
   * Zapisuje czas ostatniej synchronizacji
   */
  setLastSyncTime(date: Date = new Date()): void {
    ApplicationSettings.setString(this.LAST_SYNC_KEY, date.toISOString());
  }

  /**
   * Pobiera czas ostatniej synchronizacji
   */
  getLastSyncTime(): Date | null {
    try {
      const dateString = ApplicationSettings.getString(this.LAST_SYNC_KEY);
      if (dateString) {
        return new Date(dateString);
      }
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
    return null;
  }

  // ============= UTILITY METHODS =============

  /**
   * Sprawdza czy są dane w cache
   */
  hasLocalData(): boolean {
    return ApplicationSettings.hasKey(this.PRODUCTS_KEY);
  }

  /**
   * Czyści wszystkie dane aplikacji
   */
  clearAllData(): void {
    ApplicationSettings.remove(this.PRODUCTS_KEY);
    ApplicationSettings.remove(this.SETTINGS_KEY);
    ApplicationSettings.remove(this.LAST_SYNC_KEY);
  }

  /**
   * Eksportuje wszystkie dane jako JSON
   */
  exportData(): string {
    const data = {
      products: this.getProducts(),
      settings: this.getSettings(),
      lastSync: this.getLastSyncTime(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Importuje dane z JSON
   */
  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.products) {
        this.saveProducts(data.products);
      }
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

