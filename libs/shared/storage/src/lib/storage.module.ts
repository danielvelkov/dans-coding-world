import { Provider, ReflectiveInjector } from 'injection-js';
import { CloudinaryProvider } from './services/cloudinary-provider.service.js';

const storageProvider: Provider[] = [CloudinaryProvider];
export const storageInjector =
  ReflectiveInjector.resolveAndCreate(storageProvider);
