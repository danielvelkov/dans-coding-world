import { Provider, ReflectiveInjector } from 'injection-js';
import { CloudinaryProvider } from './services/cloudinary-provider.service.js';
import { CloudinaryProvider as MockCloudinaryProvider } from '../__mocks__/cloudinary-provider.service.js';

export const STORAGE_PROVIDER_TOKEN = 'IStorageProvider';

const storageProvider: Provider[] = [];

const isTestingE2E = process.env.NODE_ENV === 'test_e2e';

if (isTestingE2E)
  storageProvider.push({
    provide: STORAGE_PROVIDER_TOKEN,
    useClass: MockCloudinaryProvider,
  });
else
  storageProvider.push({
    provide: STORAGE_PROVIDER_TOKEN,
    useClass: CloudinaryProvider,
  });

export const storageInjector =
  ReflectiveInjector.resolveAndCreate(storageProvider);
