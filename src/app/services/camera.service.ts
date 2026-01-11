import { Injectable, NgZone } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { requestPermissions, takePicture, isAvailable } from '@nativescript/camera';
import * as imagepicker from '@nativescript/imagepicker';
import { ImageSource } from '@nativescript/core';
import { Dialogs, Application, isIOS, isAndroid } from '@nativescript/core';

export interface CameraResult {
  success: boolean;
  imageSource?: ImageSource;
  imagePath?: string;
  base64?: string;
  error?: string;
}

export interface ScanResult {
  success: boolean;
  code?: string;
  format?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CameraService {
  constructor(private ngZone: NgZone) {}

  /**
   * Sprawdza czy kamera jest dostępna na urządzeniu
   */
  isCameraAvailable(): boolean {
    return Boolean(isAvailable());
  }

  /**
   * Wybiera zdjęcie z galerii
   */
  pickFromGallery(): Observable<CameraResult> {
    return new Observable((observer) => {
      const context = imagepicker.create({
        mode: 'single',
        mediaType: imagepicker.ImagePickerMediaType.Image,
      });

      // On iOS 14+, PHPicker doesn't require explicit authorization
      // Try to authorize first, but proceed to present even if it fails on iOS
      const presentPicker = () => {
        context.present()
          .then((selection) => {
            console.log('Selection received:', selection);
            if (selection && selection.length > 0) {
              const selected = selection[0];
              // ImagePickerSelection has an 'asset' property containing the ImageAsset
              const asset = selected.asset;
              if (!asset) {
                console.error('No asset in selection:', selected);
                this.ngZone.run(() => {
                  observer.next({
                    success: false,
                    error: 'Nie udało się pobrać zdjęcia',
                  });
                  observer.complete();
                });
                return;
              }
              ImageSource.fromAsset(asset).then((imageSource) => {
                this.ngZone.run(() => {
                  observer.next({
                    success: true,
                    imageSource: imageSource,
                    imagePath: asset.android || asset.ios,
                  });
                  observer.complete();
                });
              }).catch((err) => {
                console.error('ImageSource.fromAsset error:', err);
                this.ngZone.run(() => {
                  observer.next({
                    success: false,
                    error: 'Nie udało się załadować zdjęcia',
                  });
                  observer.complete();
                });
              });
            } else {
              this.ngZone.run(() => {
                observer.next({
                  success: false,
                  error: 'Nie wybrano zdjęcia',
                });
                observer.complete();
              });
            }
          })
          .catch((err) => {
            console.error('Gallery picker present error:', err);
            this.ngZone.run(() => {
              observer.next({
                success: false,
                error: err?.message === 'Canceled' ? 'Anulowano wybór zdjęcia' : 'Błąd podczas wybierania zdjęcia',
              });
              observer.complete();
            });
          });
      };

      context
        .authorize()
        .then(() => {
          console.log('Gallery authorization successful');
          presentPicker();
        })
        .catch((err) => {
          console.log('Gallery authorization error (might still work on iOS 14+):', err);
          // On iOS 14+ with PHPicker, authorization might fail but picker still works
          if (isIOS) {
            presentPicker();
          } else {
            this.ngZone.run(() => {
              observer.next({
                success: false,
                error: 'Brak dostępu do galerii. Sprawdź uprawnienia w ustawieniach.',
              });
              observer.complete();
            });
          }
        });
    });
  }

  /**
   * Prosi o uprawnienia do kamery
   * Wymagane przed pierwszym użyciem kamery
   */
  requestCameraPermission(): Observable<boolean> {
    return from(requestPermissions()).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Camera permission denied:', error);
        return of(false);
      })
    );
  }

  /**
   * Robi zdjęcie używając natywnej kamery urządzenia
   * Zwraca ImageSource który może być użyty do wyświetlenia lub zapisu
   */
  takePicture(options?: CameraOptions): Observable<CameraResult> {
    return new Observable((observer) => {
      console.log('takePicture: checking camera availability...');
      
      if (!this.isCameraAvailable()) {
        console.log('takePicture: camera not available');
        this.ngZone.run(() => {
          observer.next({
            success: false,
            error: 'Kamera nie jest dostępna na tym urządzeniu',
          });
          observer.complete();
        });
        return;
      }

      const defaultOptions = {
        width: 800,
        height: 600,
        keepAspectRatio: true,
        saveToGallery: false,
        cameraFacing: 'rear' as const,
      };

      const finalOptions = { ...defaultOptions, ...options };

      console.log('takePicture: requesting permissions...');
      requestPermissions()
        .then(() => {
          console.log('takePicture: permissions granted, taking picture...');
          return takePicture({
            width: finalOptions.width,
            height: finalOptions.height,
            keepAspectRatio: finalOptions.keepAspectRatio,
            saveToGallery: finalOptions.saveToGallery,
            cameraFacing: finalOptions.cameraFacing,
          });
        })
        .then((imageAsset) => {
          console.log('takePicture: got imageAsset:', imageAsset);
          if (!imageAsset) {
            throw new Error('No image asset returned from camera');
          }
          // Properly convert ImageAsset to ImageSource
          return ImageSource.fromAsset(imageAsset).then((imageSource) => {
            return { imageAsset, imageSource };
          });
        })
        .then(({ imageAsset, imageSource }) => {
          console.log('takePicture: converted to imageSource');
          this.ngZone.run(() => {
            observer.next({
              success: true,
              imageSource: imageSource,
              imagePath: imageAsset.android || imageAsset.ios,
            });
            observer.complete();
          });
        })
        .catch((error) => {
          console.error('takePicture error:', error);
          let errorMessage = 'Nie udało się zrobić zdjęcia';
          
          const errorStr = error?.toString() || '';
          if (errorStr.includes('permission')) {
            errorMessage = 'Brak uprawnień do kamery. Sprawdź ustawienia aplikacji.';
          } else if (errorStr.includes('cancel') || errorStr.includes('Cancel')) {
            errorMessage = 'Anulowano robienie zdjęcia';
          } else if (error?.message) {
            errorMessage = `Błąd kamery: ${error.message}`;
          }
          
          this.ngZone.run(() => {
            observer.next({
              success: false,
              error: errorMessage,
            });
            observer.complete();
          });
        });
    });
  }

  /**
   * Symuluje skanowanie kodu kreskowego/QR
   * W produkcji użyj dedykowanej biblioteki jak @nicotron/nativescript-barcodescanner
   */
  simulateScan(): Observable<ScanResult> {
    // Symulacja skanowania - w produkcji zastąp prawdziwym skanerem
    return new Observable((observer) => {
      Dialogs.prompt({
        title: 'Symulacja skanowania',
        message: 'Wprowadź kod produktu (symulacja skanera)',
        okButtonText: 'Skanuj',
        cancelButtonText: 'Anuluj',
        defaultText: '',
        inputType: 'text',
      }).then((result) => {
        if (result.result && result.text) {
          observer.next({
            success: true,
            code: result.text.toUpperCase(),
            format: 'QR_CODE',
          });
        } else {
          observer.next({
            success: false,
            error: 'Skanowanie anulowane',
          });
        }
        observer.complete();
      }).catch((error) => {
        observer.next({
          success: false,
          error: 'Błąd podczas skanowania',
        });
        observer.complete();
      });
    });
  }

  /**
   * Wyświetla dialog wyboru źródła zdjęcia
   */
  showImageSourceDialog(): Observable<'camera' | 'gallery' | 'cancel'> {
    return new Observable((observer) => {
      Dialogs.action({
        title: 'Wybierz źródło zdjęcia',
        message: 'Skąd chcesz pobrać zdjęcie?',
        cancelButtonText: 'Anuluj',
        actions: ['Zrób zdjęcie', 'Wybierz z galerii'],
      }).then((result) => {
        if (result === 'Zrób zdjęcie') {
          observer.next('camera');
        } else if (result === 'Wybierz z galerii') {
          observer.next('gallery');
        } else {
          observer.next('cancel');
        }
        observer.complete();
      });
    });
  }

  /**
   * Sprawdza i wyświetla informację o uprawnieniach
   */
  async checkAndRequestPermissions(): Promise<boolean> {
    try {
      if (!this.isCameraAvailable()) {
        await Dialogs.alert({
          title: 'Kamera niedostępna',
          message: 'Kamera nie jest dostępna na tym urządzeniu.',
          okButtonText: 'OK',
        });
        return false;
      }

      await requestPermissions();
      return true;
    } catch (error) {
      await Dialogs.alert({
        title: 'Brak uprawnień',
        message: 'Aplikacja wymaga dostępu do kamery. Przejdź do ustawień urządzenia i włącz uprawnienia.',
        okButtonText: 'OK',
      });
      return false;
    }
  }

  /**
   * Konwertuje ImageSource do Base64
   */
  imageToBase64(imageSource: ImageSource, format: 'png' | 'jpeg' = 'jpeg', quality: number = 80): string {
    return imageSource.toBase64String(format, quality);
  }

  /**
   * Zapisuje zdjęcie do pliku
   */
  saveImageToFile(imageSource: ImageSource, filePath: string, format: 'png' | 'jpeg' = 'jpeg', quality: number = 80): boolean {
    return imageSource.saveToFile(filePath, format, quality);
  }
}

export interface CameraOptions {
  width?: number;
  height?: number;
  keepAspectRatio?: boolean;
  saveToGallery?: boolean;
  cameraFacing?: 'front' | 'rear';
}

