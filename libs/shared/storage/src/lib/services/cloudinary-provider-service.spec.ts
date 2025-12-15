import { ReflectiveInjector } from 'injection-js';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryProvider } from '../services/cloudinary-provider.service.js';
import fs from 'fs';

const injector = ReflectiveInjector.resolveAndCreate([CloudinaryProvider]);
const storageProvider = injector.get(CloudinaryProvider) as CloudinaryProvider;

describe('CloudinaryProvider', () => {
  const fileExistsSpy = jest.spyOn(fs, 'existsSync').mockImplementation();

  describe('uploadFile()', () => {
    it('should upload when file exists and return secure_url of response', async () => {
      const EXPECTED_RESULT = 'https://example.com/file.jpg';
      fileExistsSpy.mockReturnValueOnce(true);

      jest.spyOn(cloudinary.uploader, 'upload').mockResolvedValue({
        secure_url: EXPECTED_RESULT,
      } as any);

      const url = await storageProvider.uploadFile('/valid/file.png');
      expect(url).toBe(EXPECTED_RESULT);
    });

    it('should throw when file does not exist', async () => {
      fileExistsSpy.mockReturnValueOnce(false);

      await expect(
        storageProvider.uploadFile('/bogus/file.pgg')
      ).rejects.toThrow(/file does not exist/i);
    });
  });
});
