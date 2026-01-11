import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule } from '@nativescript/angular';
import { NativeScriptFormsModule } from '@nativescript/angular';
import { NativeScriptHttpClientModule } from '@nativescript/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Feature modules
import { ProductsModule } from './features/products/products.module';
import { SettingsModule } from './features/settings/settings.module';

// Services
import { ProductService } from './services/product.service';
import { CameraService } from './services/camera.service';
import { StorageService } from './services/storage.service';

@NgModule({
  bootstrap: [AppComponent],
  imports: [
    NativeScriptModule,
    NativeScriptFormsModule,
    NativeScriptHttpClientModule,
    AppRoutingModule,
    ProductsModule,
    SettingsModule,
  ],
  declarations: [AppComponent],
  providers: [ProductService, CameraService, StorageService],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppModule {}

