/**
 * The contract for any file storage service provider (Cloudinary, Local Disk, etc.)
 */
export interface IStorageProvider {
  /**
   * Uploads a file and returns the public access URL/link.
   * @param filePath The file path.
   * @returns The public URL of the uploaded file.
   * @throws {Error} When file does not exist
   */
  uploadFile(filePath: string): Promise<string>;

  /**
   * Deletes a file given its URL or public ID.
   * @param fileUrl The URL or public ID of the file to delete.
   */
  deleteFile(fileUrl: string): Promise<void>;
}
