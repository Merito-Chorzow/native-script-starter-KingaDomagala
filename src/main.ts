// Polyfill queueMicrotask for older environments
if (typeof queueMicrotask === 'undefined') {
  (global as any).queueMicrotask = (callback: () => void) => {
    Promise.resolve().then(callback);
  };
}

import 'zone.js';
import '@angular/compiler';
import { platformNativeScript, runNativeScriptAngularApp } from '@nativescript/angular';
import '@nativescript/theme';
import { AppModule } from './app/app.module';

runNativeScriptAngularApp({
  appModuleBootstrap: () => platformNativeScript().bootstrapModule(AppModule),
});

