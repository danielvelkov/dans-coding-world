import { v2 as cloudinary } from 'cloudinary';
import { IStorageProvider } from '../interfaces/storage-provider.interface.js';
import { existsSync } from 'fs';

export class CloudinaryProvider implements IStorageProvider {
  async uploadFile(filePath: string): Promise<string> {
    if (!existsSync(filePath))
      throw new Error(`File does not exist, can't find (${filePath})`);
    const res = await cloudinary.uploader.upload(filePath);
    return res.secure_url;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (this.isValidHttpUrl(fileUrl))
      await cloudinary.uploader.destroy(this.getPublicId(fileUrl));
    else await cloudinary.uploader.destroy(fileUrl);
  }

  /**
   * Extracts public id from cloudinary asset URL
   *
   * Public id is the filename part of the URL.
   * @example http://res.cloudinary.com/[USER_CLOUD_ID]/image/upload/v[timestamp]/[PUBLIC_ID].jpg
   * @param fileUrl
   * @returns
   */
  private getPublicId(fileUrl: string) {
    const matches = fileUrl.match(/\/([^\\/]*?)\.\w+$/);
    if (!matches) throw new Error('Missing public id in URL');

    return matches[0];
  }

  private isValidHttpUrl(string: string) {
    let url;

    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }

    return url.protocol === 'http:' || url.protocol === 'https:';
  }
}
