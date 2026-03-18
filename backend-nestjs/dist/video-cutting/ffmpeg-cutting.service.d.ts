export declare class FfmpegCuttingService {
    private readonly logger;
    private activeProcesses;
    private readonly queue;
    private ensureTempDir;
    private processQueue;
    clipVideo(inputUrl: string, startSeconds: number, endSeconds: number): Promise<string>;
    getQueueStatus(): {
        activeProcesses: number;
        queuedRequests: number;
        maxConcurrent: number;
    };
    deleteTempFile(filePath: string): void;
}
