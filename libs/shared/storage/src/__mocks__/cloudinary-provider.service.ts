import { IStorageProvider } from '../lib/interfaces/storage-provider.interface.js';

export const MOCK_RESULT = 'http://mock.cloudinary.com/uploaded/avatar.png';

export class CloudinaryProvider implements IStorageProvider {
  async uploadFile(filePath: string): Promise<string> {
    return MOCK_RESULT;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    console.debug(`Mock delete occurred for file ${fileUrl}`);
  }
}
