import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { Dialogs } from '@nativescript/core';
import { Product, ProductStatus } from '../../../models/product.model';
import { ProductService } from '../../../services/product.service';
import { CameraService } from '../../../services/camera.service';

@Component({
  selector: 'ns-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  isLoading = false;
  errorMessage = '';
  productId = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private routerExtensions: RouterExtensions,
    private productService: ProductService,
    private cameraService: CameraService
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          this.productId = params['id'];
          this.isLoading = true;
          return this.productService.getProductById(this.productId);
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.product = response.data;
          } else {
            this.errorMessage = response.error || 'Nie znaleziono produktu';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Błąd podczas ładowania produktu';
          console.error('Load product error:', error);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBack(): void {
    this.routerExtensions.back();
  }

  onEdit(): void {
    if (this.product) {
      this.routerExtensions.navigate(['/products/edit', this.product.id], {
        transition: {
          name: 'slide',
          duration: 200,
          curve: 'ease',
        },
      });
    }
  }

  async onDelete(): Promise<void> {
    if (!this.product) return;

    const result = await Dialogs.confirm({
      title: 'Usuń produkt',
      message: `Czy na pewno chcesz usunąć "${this.product.name}"? Tej operacji nie można cofnąć.`,
      okButtonText: 'Usuń',
      cancelButtonText: 'Anuluj',
    });

    if (result) {
      this.isLoading = true;
      this.productService
        .deleteProduct(this.product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              Dialogs.alert({
                title: 'Sukces',
                message: 'Produkt został usunięty',
                okButtonText: 'OK',
              }).then(() => {
                this.routerExtensions.back();
              });
            } else {
              Dialogs.alert({
                title: 'Błąd',
                message: response.error || 'Nie udało się usunąć produktu',
                okButtonText: 'OK',
              });
            }
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Delete error:', error);
            Dialogs.alert({
              title: 'Błąd',
              message: 'Wystąpił błąd podczas usuwania produktu',
              okButtonText: 'OK',
            });
          },
        });
    }
  }

  onTakePhoto(): void {
    this.cameraService.takePicture().subscribe({
      next: (result) => {
        if (result.success) {
          // W rzeczywistej aplikacji zapisz zdjęcie i zaktualizuj produkt
          Dialogs.alert({
            title: 'Zdjęcie zrobione',
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
      error: (error) => {
        console.error('Camera error:', error);
      },
    });
  }

  async onUpdateQuantity(): Promise<void> {
    if (!this.product) return;

    const result = await Dialogs.prompt({
      title: 'Zaktualizuj ilość',
      message: 'Wprowadź nową ilość produktu',
      defaultText: this.product.quantity.toString(),
      okButtonText: 'Zapisz',
      cancelButtonText: 'Anuluj',
      inputType: 'number',
    });

    if (result.result && result.text) {
      const newQuantity = parseInt(result.text, 10);
      if (!isNaN(newQuantity) && newQuantity >= 0) {
        this.isLoading = true;
        this.productService
          .updateProduct(this.product.id, { quantity: newQuantity })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              this.isLoading = false;
              if (response.success && response.data) {
                this.product = response.data;
                Dialogs.alert({
                  title: 'Sukces',
                  message: 'Ilość została zaktualizowana',
                  okButtonText: 'OK',
                });
              }
            },
            error: (error) => {
              this.isLoading = false;
              console.error('Update error:', error);
            },
          });
      }
    }
  }

  getStatusColor(status: ProductStatus): string {
    switch (status) {
      case ProductStatus.InStock:
        return '#4CAF50';
      case ProductStatus.LowStock:
        return '#FF9800';
      case ProductStatus.OutOfStock:
        return '#F44336';
      case ProductStatus.Pending:
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  }

  getStatusText(status: ProductStatus): string {
    switch (status) {
      case ProductStatus.InStock:
        return 'Dostępny';
      case ProductStatus.LowStock:
        return 'Niski stan';
      case ProductStatus.OutOfStock:
        return 'Brak w magazynie';
      case ProductStatus.Pending:
        return 'Oczekuje';
      default:
        return 'Nieznany';
    }
  }

  formatDate(date: Date): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

