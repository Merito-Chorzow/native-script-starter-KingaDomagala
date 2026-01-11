import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { Dialogs, ImageSource } from '@nativescript/core';
import { Product, ProductCreateDto, ProductUpdateDto } from '../../../models/product.model';
import { ProductService } from '../../../services/product.service';
import { CameraService } from '../../../services/camera.service';

@Component({
  selector: 'ns-product-add',
  templateUrl: './product-add.component.html',
  styleUrls: ['./product-add.component.css'],
})
export class ProductAddComponent implements OnInit, OnDestroy {
  productForm!: FormGroup;
  isEditMode = false;
  productId: string | null = null;
  isLoading = false;
  isSaving = false;
  scannedCode = '';
  capturedImagePath = '';
  capturedImageSource: ImageSource | null = null;

  categories = [
    'Elektronika',
    'Akcesoria',
    'Oprogramowanie',
    'Sprzęt biurowy',
    'Inne',
  ];

  // Expose Math to template
  Math = Math;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private routerExtensions: RouterExtensions,
    private productService: ProductService,
    private cameraService: CameraService,
    private ngZone: NgZone
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Sprawdź czy jesteśmy w trybie edycji
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.productId = params['id'];
        this.loadProduct();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      quantity: [0, [Validators.required, Validators.min(0), Validators.max(99999)]],
      category: ['', [Validators.required]],
    });
  }

  private loadProduct(): void {
    if (!this.productId) return;

    this.isLoading = true;
    this.productService
      .getProductById(this.productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.isLoading = false;
            if (response.success && response.data) {
              this.populateForm(response.data);
            } else {
              Dialogs.alert({
                title: 'Błąd',
                message: 'Nie udało się załadować produktu',
                okButtonText: 'OK',
              }).then(() => this.onCancel());
            }
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            this.isLoading = false;
            console.error('Load product error:', error);
            this.onCancel();
          });
        },
      });
  }

  private populateForm(product: Product): void {
    this.productForm.patchValue({
      name: product.name,
      code: product.code,
      description: product.description,
      quantity: product.quantity,
      category: product.category,
    });
    this.capturedImagePath = product.imageUrl || '';
  }

  onCancel(): void {
    this.routerExtensions.back();
  }

  async onSubmit(): Promise<void> {
    if (this.productForm.invalid) {
      this.markFormTouched();
      await Dialogs.alert({
        title: 'Błąd walidacji',
        message: 'Proszę wypełnić wszystkie wymagane pola poprawnie',
        okButtonText: 'OK',
      });
      return;
    }

    this.isSaving = true;

    if (this.isEditMode && this.productId) {
      this.updateProduct();
    } else {
      this.createProduct();
    }
  }

  private createProduct(): void {
    // Convert ImageSource to base64 data URL for storage
    let imageUrl = '';
    if (this.capturedImageSource) {
      try {
        const base64 = this.capturedImageSource.toBase64String('jpeg', 80);
        imageUrl = `data:image/jpeg;base64,${base64}`;
      } catch (e) {
        console.error('Failed to convert image to base64:', e);
      }
    }
    
    const productData: ProductCreateDto = {
      ...this.productForm.value,
      imageUrl: imageUrl,
    };

    this.productService
      .createProduct(productData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.ngZone.run(async () => {
            this.isSaving = false;
            if (response.success) {
              await Dialogs.alert({
                title: 'Sukces',
                message: 'Produkt został dodany pomyślnie',
                okButtonText: 'OK',
              });
              this.routerExtensions.navigate(['/products'], {
                clearHistory: true,
                transition: {
                  name: 'slideBottom',
                  duration: 200,
                },
              });
            } else {
              await Dialogs.alert({
                title: 'Błąd',
                message: response.error || 'Nie udało się dodać produktu',
                okButtonText: 'OK',
              });
            }
          });
        },
        error: (error) => {
          this.ngZone.run(async () => {
            this.isSaving = false;
            console.error('Create product error:', error);
            await Dialogs.alert({
              title: 'Błąd',
              message: 'Wystąpił błąd podczas zapisywania produktu',
              okButtonText: 'OK',
            });
          });
        },
      });
  }

  private updateProduct(): void {
    if (!this.productId) return;

    // Convert ImageSource to base64 data URL for storage
    let imageUrl = this.capturedImagePath; // Keep existing URL if no new image
    if (this.capturedImageSource) {
      try {
        const base64 = this.capturedImageSource.toBase64String('jpeg', 80);
        imageUrl = `data:image/jpeg;base64,${base64}`;
      } catch (e) {
        console.error('Failed to convert image to base64:', e);
      }
    }
    
    const productData: ProductUpdateDto = {
      ...this.productForm.value,
      imageUrl: imageUrl,
    };

    this.productService
      .updateProduct(this.productId, productData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.ngZone.run(async () => {
            this.isSaving = false;
            if (response.success) {
              await Dialogs.alert({
                title: 'Sukces',
                message: 'Produkt został zaktualizowany',
                okButtonText: 'OK',
              });
              this.routerExtensions.back();
            } else {
              await Dialogs.alert({
                title: 'Błąd',
                message: response.error || 'Nie udało się zaktualizować produktu',
                okButtonText: 'OK',
              });
            }
          });
        },
        error: (error) => {
          this.ngZone.run(async () => {
            this.isSaving = false;
            console.error('Update product error:', error);
            await Dialogs.alert({
              title: 'Błąd',
              message: 'Wystąpił błąd podczas aktualizacji produktu',
              okButtonText: 'OK',
            });
          });
        },
      });
  }

  onScanCode(): void {
    this.cameraService.simulateScan().subscribe({
      next: (result) => {
        if (result.success && result.code) {
          this.scannedCode = result.code;
          this.productForm.patchValue({ code: result.code });
          Dialogs.alert({
            title: 'Kod zeskanowany',
            message: `Zeskanowano kod: ${result.code}`,
            okButtonText: 'OK',
          });
        }
      },
      error: (error) => {
        console.error('Scan error:', error);
      },
    });
  }

  onTakePhoto(): void {
    this.cameraService.showImageSourceDialog().subscribe({
      next: (source) => {
        if (source === 'camera') {
          this.capturePhoto();
        } else if (source === 'gallery') {
          this.pickFromGallery();
        }
      },
    });
  }

  private pickFromGallery(): void {
    this.cameraService.pickFromGallery().subscribe({
      next: (result) => {
        if (result.success && result.imageSource) {
          this.capturedImageSource = result.imageSource;
          this.capturedImagePath = result.imagePath || '';
          console.log('Gallery image captured, imageSource:', !!this.capturedImageSource);
          Dialogs.alert({
            title: 'Zdjęcie',
            message: 'Zdjęcie zostało wybrane z galerii',
            okButtonText: 'OK',
          });
        } else {
          Dialogs.alert({
            title: 'Info',
            message: result.error || 'Nie wybrano zdjęcia',
            okButtonText: 'OK',
          });
        }
      },
      error: (error) => {
        console.error('Gallery error:', error);
        Dialogs.alert({
          title: 'Błąd',
          message: 'Wystąpił błąd podczas wybierania zdjęcia',
          okButtonText: 'OK',
        });
      },
    });
  }

  private capturePhoto(): void {
    this.cameraService.takePicture({ width: 800, height: 600 }).subscribe({
      next: (result) => {
        if (result.success && result.imageSource) {
          this.capturedImageSource = result.imageSource;
          this.capturedImagePath = result.imagePath || '';
          console.log('Camera image captured, imageSource:', !!this.capturedImageSource);
          Dialogs.alert({
            title: 'Zdjęcie',
            message: 'Zdjęcie zostało zrobione pomyślnie',
            okButtonText: 'OK',
          });
        } else {
          Dialogs.alert({
            title: 'Błąd',
            message: result.error || 'Nie udało się zrobić zdjęcia',
            okButtonText: 'OK',
          });
        }
      },
    });
  }

  private markFormTouched(): void {
    Object.keys(this.productForm.controls).forEach((key) => {
      this.productForm.get(key)?.markAsTouched();
    });
  }

  // Gettery dla walidacji formularza
  get nameError(): string {
    const control = this.productForm.get('name');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Nazwa jest wymagana';
      if (control.errors['minlength']) return 'Nazwa musi mieć min. 3 znaki';
      if (control.errors['maxlength']) return 'Nazwa może mieć max. 100 znaków';
    }
    return '';
  }

  get codeError(): string {
    const control = this.productForm.get('code');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Kod jest wymagany';
      if (control.errors['minlength']) return 'Kod musi mieć min. 3 znaki';
      if (control.errors['maxlength']) return 'Kod może mieć max. 50 znaków';
    }
    return '';
  }

  get quantityError(): string {
    const control = this.productForm.get('quantity');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Ilość jest wymagana';
      if (control.errors['min']) return 'Ilość nie może być ujemna';
      if (control.errors['max']) return 'Ilość jest zbyt duża';
    }
    return '';
  }

  get categoryError(): string {
    const control = this.productForm.get('category');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Kategoria jest wymagana';
    }
    return '';
  }

  get descriptionError(): string {
    const control = this.productForm.get('description');
    if (control?.touched && control?.errors) {
      if (control.errors['maxlength']) return 'Opis może mieć max. 500 znaków';
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.productForm.get(fieldName);
    return !!(control?.touched && control?.invalid);
  }
}

