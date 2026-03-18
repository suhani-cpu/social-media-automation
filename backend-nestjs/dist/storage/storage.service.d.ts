import { ConfigService } from '@nestjs/config';
export interface StorageProvider {
    upload(localPath: string, remotePath: string): Promise<string>;
    download(remotePath: string, localPath: string): Promise<void>;
    delete(remotePath: string): Promise<void>;
    getSignedUrl(remotePath: string, expirySeconds?: number): Promise<string>;
    exists(remotePath: string): Promise<boolean>;
}
export declare class StorageService implements StorageProvider {
    private readonly configService;
    private readonly logger;
    private s3;
    private readonly bucket;
    private readonly useS3;
    private readonly localDir;
    constructor(configService: ConfigService);
    upload(localPath: string, remotePath: string): Promise<string>;
    download(remotePath: string, localPath: string): Promise<void>;
    delete(remotePath: string): Promise<void>;
    getSignedUrl(remotePath: string, expirySeconds?: number): Promise<string>;
    exists(remotePath: string): Promise<boolean>;
}
