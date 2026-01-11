import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SearchBar } from '@nativescript/core';
import { Product, ProductStatus } from '../../../models/product.model';
import { ProductService } from '../../../services/product.service';
import { CameraService } from '../../../services/camera.service';

@Component({
  selector: 'ns-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  isLoading = false;
  searchQuery = '';
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private cameraService: CameraService,
    private routerExtensions: RouterExtensions,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.subscribeToProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToProducts(): void {
    this.productService.products$
      .pipe(takeUntil(this.destroy$))
      .subscribe((products) => {
        this.ngZone.run(() => {
          this.products = products;
          this.applyFilter();
        });
      });
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.productService
      .getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.isLoading = false;
            if (!response.success) {
              this.errorMessage = response.error || 'Nie udało się pobrać produktów';
            }
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.errorMessage = 'Błąd połączenia z serwerem';
            console.error('Load products error:', error);
          });
        },
      });
  }

  onSearchBarLoaded(event: any): void {
    const searchBar = event.object as SearchBar;
    searchBar.hint = 'Szukaj produktów...';
  }

  onSearchTextChange(event: any): void {
    this.searchQuery = event.value || '';
    this.applyFilter();
  }

  onSearchSubmit(event: any): void {
    this.applyFilter();
  }

  onClearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredProducts = [...this.products];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredProducts = this.products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }
  }

  onProductTap(product: Product): void {
    this.ngZone.run(() => {
      this.routerExtensions.navigate(['/products/detail', product.id], {
        transition: {
          name: 'slide',
          duration: 200,
          curve: 'ease',
        },
      });
    });
  }

  onAddProduct(): void {
    this.ngZone.run(() => {
      this.routerExtensions.navigate(['/products/add'], {
        transition: {
          name: 'slideTop',
          duration: 200,
          curve: 'ease',
        },
      });
    });
  }

  onScanProduct(): void {
    this.cameraService.simulateScan().subscribe({
      next: (result) => {
        this.ngZone.run(() => {
          if (result.success && result.code) {
            this.searchQuery = result.code;
            this.applyFilter();
            
            // Jeśli znaleziono dokładnie jeden produkt, przejdź do szczegółów
            if (this.filteredProducts.length === 1) {
              this.onProductTap(this.filteredProducts[0]);
            }
          }
        });
      },
      error: (error) => {
        console.error('Scan error:', error);
      },
    });
  }

  onSettingsTap(): void {
    this.ngZone.run(() => {
      this.routerExtensions.navigate(['/settings'], {
        transition: {
          name: 'slide',
          duration: 200,
          curve: 'ease',
        },
      });
    });
  }

  onPullToRefresh(event: any): void {
    const pullRefresh = event.object;
    this.loadProducts();
    
    // Zakończ odświeżanie po krótkiej chwili
    setTimeout(() => {
      this.ngZone.run(() => {
        pullRefresh.refreshing = false;
      });
    }, 1000);
  }

  getStatusColor(status: ProductStatus): string {
    switch (status) {
      case ProductStatus.InStock:
        return '#4CAF50'; // Zielony
      case ProductStatus.LowStock:
        return '#FF9800'; // Pomarańczowy
      case ProductStatus.OutOfStock:
        return '#F44336'; // Czerwony
      case ProductStatus.Pending:
        return '#9E9E9E'; // Szary
      default:
        return '#9E9E9E';
    }
  }

  getStatusText(status: ProductStatus): string {
    switch (status) {
      case ProductStatus.InStock:
        return 'Dostępny';
      case ProductStatus.LowStock:
        return 'Mało';
      case ProductStatus.OutOfStock:
        return 'Brak';
      case ProductStatus.Pending:
        return 'Oczekuje';
      default:
        return 'Nieznany';
    }
  }

  getStatusIcon(status: ProductStatus): string {
    switch (status) {
      case ProductStatus.InStock:
        return '✓';
      case ProductStatus.LowStock:
        return '⚠';
      case ProductStatus.OutOfStock:
        return '✗';
      case ProductStatus.Pending:
        return '⏳';
      default:
        return '?';
    }
  }

  getInStockCount(): number {
    return this.products.filter(p => p.status === ProductStatus.InStock).length;
  }

  getOutOfStockCount(): number {
    return this.products.filter(p => p.status === ProductStatus.OutOfStock).length;
  }
}

