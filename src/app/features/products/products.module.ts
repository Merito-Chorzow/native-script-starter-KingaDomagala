import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptRouterModule } from '@nativescript/angular';
import { NativeScriptFormsModule } from '@nativescript/angular';
import { ReactiveFormsModule } from '@angular/forms';

import { ProductListComponent } from './product-list/product-list.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';
import { ProductAddComponent } from './product-add/product-add.component';

const routes = [
  { path: '', component: ProductListComponent },
  { path: 'detail/:id', component: ProductDetailComponent },
  { path: 'add', component: ProductAddComponent },
  { path: 'edit/:id', component: ProductAddComponent },
];

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptFormsModule,
    ReactiveFormsModule,
    NativeScriptRouterModule.forChild(routes),
  ],
  declarations: [
    ProductListComponent,
    ProductDetailComponent,
    ProductAddComponent,
  ],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ProductsModule {}

