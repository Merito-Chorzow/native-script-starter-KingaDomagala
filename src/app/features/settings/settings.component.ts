import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { Dialogs } from '@nativescript/core';
import { StorageService, AppSettings } from '../../services/storage.service';
import { ProductService } from '../../services/product.service';
import { CameraService } from '../../services/camera.service';

@Component({
  selector: 'ns-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {
  settings: AppSettings = {
    offlineMode: false,
    darkMode: false,
    autoSync: true,
    language: 'pl',
    scanSoundEnabled: true,
    vibrationEnabled: true,
  };

  lastSyncTime: string = 'Nigdy';
  apiStatus: 'checking' | 'connected' | 'disconnected' = 'checking';
  cameraAvailable = false;
  appVersion = '1.0.0';

  constructor(
    private routerExtensions: RouterExtensions,
    private storageService: StorageService,
    private productService: ProductService,
    private cameraService: CameraService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.checkApiStatus();
    this.checkCameraAvailability();
    this.loadLastSyncTime();
  }

  private loadSettings(): void {
    this.settings = this.storageService.getSettings();
  }

  private loadLastSyncTime(): void {
    const lastSync = this.storageService.getLastSyncTime();
    if (lastSync) {
      this.lastSyncTime = lastSync.toLocaleString('pl-PL');
    }
  }

  private checkApiStatus(): void {
    this.apiStatus = 'checking';
    this.productService.checkApiConnection().subscribe({
      next: (isConnected) => {
        this.apiStatus = isConnected ? 'connected' : 'disconnected';
      },
      error: () => {
        this.apiStatus = 'disconnected';
      },
    });
  }

  private checkCameraAvailability(): void {
    this.cameraAvailable = this.cameraService.isCameraAvailable();
  }

  onBack(): void {
    this.routerExtensions.back();
  }

  // Toggle handlers
  onOfflineModeChange(value: boolean): void {
    this.settings.offlineMode = value;
    this.storageService.updateSetting('offlineMode', value);
  }

  onDarkModeChange(value: boolean): void {
    this.settings.darkMode = value;
    this.storageService.updateSetting('darkMode', value);
    // W produkcji: zastosuj motyw ciemny
  }

  onAutoSyncChange(value: boolean): void {
    this.settings.autoSync = value;
    this.storageService.updateSetting('autoSync', value);
  }

  onScanSoundChange(value: boolean): void {
    this.settings.scanSoundEnabled = value;
    this.storageService.updateSetting('scanSoundEnabled', value);
  }

  onVibrationChange(value: boolean): void {
    this.settings.vibrationEnabled = value;
    this.storageService.updateSetting('vibrationEnabled', value);
  }

  // Actions
  async onSyncNow(): Promise<void> {
    const result = await Dialogs.confirm({
      title: 'Synchronizacja',
      message: 'Czy chcesz zsynchronizować dane z serwerem?',
      okButtonText: 'Synchronizuj',
      cancelButtonText: 'Anuluj',
    });

    if (result) {
      // Symulacja synchronizacji
      await Dialogs.alert({
        title: 'Synchronizacja',
        message: 'Dane zostały zsynchronizowane pomyślnie',
        okButtonText: 'OK',
      });
      this.storageService.setLastSyncTime();
      this.loadLastSyncTime();
    }
  }

  async onTestCamera(): Promise<void> {
    const hasPermission = await this.cameraService.checkAndRequestPermissions();
    if (hasPermission) {
      this.cameraService.takePicture().subscribe({
        next: (result) => {
          if (result.success) {
            Dialogs.alert({
              title: 'Test kamery',
              message: 'Kamera działa poprawnie! Zdjęcie zostało zrobione.',
              okButtonText: 'OK',
            });
          } else {
            Dialogs.alert({
              title: 'Test kamery',
              message: result.error || 'Test kamery nie powiódł się',
              okButtonText: 'OK',
            });
          }
        },
      });
    }
  }

  async onClearCache(): Promise<void> {
    const result = await Dialogs.confirm({
      title: 'Wyczyść cache',
      message: 'Czy na pewno chcesz wyczyścić cache aplikacji? Lokalne dane zostaną usunięte.',
      okButtonText: 'Wyczyść',
      cancelButtonText: 'Anuluj',
    });

    if (result) {
      this.storageService.clearProducts();
      await Dialogs.alert({
        title: 'Cache wyczyszczony',
        message: 'Cache aplikacji został wyczyszczony',
        okButtonText: 'OK',
      });
    }
  }

  async onResetSettings(): Promise<void> {
    const result = await Dialogs.confirm({
      title: 'Resetuj ustawienia',
      message: 'Czy na pewno chcesz przywrócić ustawienia domyślne?',
      okButtonText: 'Resetuj',
      cancelButtonText: 'Anuluj',
    });

    if (result) {
      this.storageService.resetSettings();
      this.loadSettings();
      await Dialogs.alert({
        title: 'Ustawienia zresetowane',
        message: 'Ustawienia zostały przywrócone do wartości domyślnych',
        okButtonText: 'OK',
      });
    }
  }

  async onExportData(): Promise<void> {
    const data = this.storageService.exportData();
    await Dialogs.alert({
      title: 'Eksport danych',
      message: 'Dane zostały wyeksportowane (w produkcji: zapisz do pliku lub udostępnij)',
      okButtonText: 'OK',
    });
    console.log('Exported data:', data);
  }

  async onAbout(): Promise<void> {
    await Dialogs.alert({
      title: 'O aplikacji',
      message: `Scan Inventory v${this.appVersion}\n\nAplikacja do zarządzania inwentarzem z funkcją skanowania.\n\n© 2024 Developer`,
      okButtonText: 'OK',
    });
  }

  getApiStatusText(): string {
    switch (this.apiStatus) {
      case 'checking':
        return 'Sprawdzanie...';
      case 'connected':
        return 'Połączono';
      case 'disconnected':
        return 'Brak połączenia';
      default:
        return 'Nieznany';
    }
  }

  getApiStatusColor(): string {
    switch (this.apiStatus) {
      case 'connected':
        return '#4CAF50';
      case 'disconnected':
        return '#F44336';
      default:
        return '#FF9800';
    }
  }
}

