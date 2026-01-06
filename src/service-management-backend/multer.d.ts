declare module 'multer' {
  import { Request } from 'express';
  
  export namespace multer {
    export interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }
    
    export type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;
    
    export interface DiskStorageOptions {
      destination?: (req: Request, file: File, callback: (error: Error | null, destination: string) => void) => void;
      filename?: (req: Request, file: File, callback: (error: Error | null, filename: string) => void) => void;
    }
    
    export interface Options {
      dest?: string;
      storage?: unknown;
      limits?: {
        fieldNameSize?: number;
        fieldSize?: number;
        fields?: number;
        fileSize?: number;
        files?: number;
        headerPairs?: number;
      };
      fileFilter?: (req: Request, file: File, callback: FileFilterCallback) => void;
    }
    
    export interface Multer {
      (options?: Options): unknown;
      diskStorage(options: DiskStorageOptions): unknown;
      memoryStorage(): unknown;
    }
  }
  
  const multer: multer.Multer;
  export default multer;
  export { multer };
}

