import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap, delay } from 'rxjs/operators';
import {
  Product,
  ProductCreateDto,
  ProductUpdateDto,
  ProductStatus,
  ApiResponse,
} from '../models/product.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  // Mock API URL - w produkcji zastąp prawdziwym API
  private readonly API_URL = 'https://jsonplaceholder.typicode.com';
  
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  // Mock data for demo purposes
  private mockProducts: Product[] = [
    {
      id: '1',
      name: 'Laptop Dell XPS 15',
      code: 'DELL-XPS-15-2024',
      description: 'Wysokowydajny laptop dla profesjonalistów z ekranem 15.6" OLED',
      status: ProductStatus.InStock,
      quantity: 25,
      category: 'Elektronika',
      imageUrl: '',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      name: 'Monitor Samsung 27"',
      code: 'SAM-MON-27-4K',
      description: 'Monitor 4K UHD do pracy biurowej i rozrywki',
      status: ProductStatus.LowStock,
      quantity: 5,
      category: 'Elektronika',
      imageUrl: '',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-12'),
    },
    {
      id: '3',
      name: 'Klawiatura Logitech MX Keys',
      code: 'LOG-MXKEYS-2024',
      description: 'Bezprzewodowa klawiatura z podświetleniem',
      status: ProductStatus.InStock,
      quantity: 50,
      category: 'Akcesoria',
      imageUrl: '',
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-08'),
    },
    {
      id: '4',
      name: 'Mysz Razer DeathAdder',
      code: 'RAZ-DA-V3',
      description: 'Ergonomiczna mysz gamingowa z sensorem optycznym',
      status: ProductStatus.OutOfStock,
      quantity: 0,
      category: 'Akcesoria',
      imageUrl: '',
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-20'),
    },
  ];

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {
    this.loadProducts();
  }

  private loadProducts(): void {
    // Ładowanie produktów z lokalnego storage lub użycie mock data
    const savedProducts = this.storageService.getProducts();
    if (savedProducts && savedProducts.length > 0) {
      this.productsSubject.next(savedProducts);
    } else {
      this.productsSubject.next(this.mockProducts);
      this.storageService.saveProducts(this.mockProducts);
    }
  }

  /**
   * Pobiera wszystkie produkty
   * Symuluje wywołanie API z opóźnieniem
   */
  getProducts(): Observable<ApiResponse<Product[]>> {
    // Symulacja wywołania API
    return of({
      success: true,
      data: this.productsSubject.value,
    }).pipe(
      delay(300), // Symulacja opóźnienia sieciowego
      tap((response) => {
        if (response.data) {
          this.productsSubject.next(response.data);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Pobiera pojedynczy produkt po ID
   */
  getProductById(id: string): Observable<ApiResponse<Product>> {
    const product = this.productsSubject.value.find((p) => p.id === id);
    
    if (product) {
      return of({
        success: true,
        data: product,
      }).pipe(delay(200));
    }
    
    return of({
      success: false,
      error: 'Produkt nie został znaleziony',
    }).pipe(delay(200));
  }

  /**
   * Tworzy nowy produkt
   * POST /products
   */
  createProduct(productData: ProductCreateDto): Observable<ApiResponse<Product>> {
    const newProduct: Product = {
      id: this.generateId(),
      ...productData,
      status: this.calculateStatus(productData.quantity),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Symulacja POST do API
    return of(newProduct).pipe(
      delay(500),
      map((product) => {
        const currentProducts = this.productsSubject.value;
        const updatedProducts = [product, ...currentProducts];
        this.productsSubject.next(updatedProducts);
        this.storageService.saveProducts(updatedProducts);
        
        return {
          success: true,
          data: product,
          message: 'Produkt został pomyślnie dodany',
        };
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Aktualizuje istniejący produkt
   * PUT /products/:id
   */
  updateProduct(id: string, updates: ProductUpdateDto): Observable<ApiResponse<Product>> {
    const currentProducts = this.productsSubject.value;
    const index = currentProducts.findIndex((p) => p.id === id);

    if (index === -1) {
      return of({
        success: false,
        error: 'Produkt nie został znaleziony',
      });
    }

    const updatedProduct: Product = {
      ...currentProducts[index],
      ...updates,
      status: updates.quantity !== undefined 
        ? this.calculateStatus(updates.quantity)
        : currentProducts[index].status,
      updatedAt: new Date(),
    };

    return of(updatedProduct).pipe(
      delay(400),
      map((product) => {
        const newProducts = [...currentProducts];
        newProducts[index] = product;
        this.productsSubject.next(newProducts);
        this.storageService.saveProducts(newProducts);

        return {
          success: true,
          data: product,
          message: 'Produkt został zaktualizowany',
        };
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Usuwa produkt
   * DELETE /products/:id
   */
  deleteProduct(id: string): Observable<ApiResponse<void>> {
    const currentProducts = this.productsSubject.value;
    const index = currentProducts.findIndex((p) => p.id === id);

    if (index === -1) {
      return of({
        success: false,
        error: 'Produkt nie został znaleziony',
      });
    }

    return of(null).pipe(
      delay(300),
      map(() => {
        const newProducts = currentProducts.filter((p) => p.id !== id);
        this.productsSubject.next(newProducts);
        this.storageService.saveProducts(newProducts);

        return {
          success: true,
          message: 'Produkt został usunięty',
        };
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Wyszukuje produkty po nazwie lub kodzie
   */
  searchProducts(query: string): Observable<Product[]> {
    const lowerQuery = query.toLowerCase();
    const filtered = this.productsSubject.value.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.code.toLowerCase().includes(lowerQuery)
    );
    return of(filtered);
  }

  /**
   * Sprawdza połączenie z API
   */
  checkApiConnection(): Observable<boolean> {
    return this.http.get(`${this.API_URL}/posts/1`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  private calculateStatus(quantity: number): ProductStatus {
    if (quantity === 0) return ProductStatus.OutOfStock;
    if (quantity <= 10) return ProductStatus.LowStock;
    return ProductStatus.InStock;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private handleError(error: HttpErrorResponse): Observable<ApiResponse<never>> {
    let errorMessage = 'Wystąpił nieznany błąd';
    
    if (error.error instanceof ErrorEvent) {
      // Błąd po stronie klienta
      errorMessage = `Błąd: ${error.error.message}`;
    } else {
      // Błąd po stronie serwera
      errorMessage = `Błąd serwera: ${error.status} - ${error.message}`;
    }
    
    console.error('ProductService Error:', errorMessage);
    return throwError(() => ({
      success: false,
      error: errorMessage,
    }));
  }
}

