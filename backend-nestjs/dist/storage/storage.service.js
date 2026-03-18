"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
let StorageService = StorageService_1 = class StorageService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(StorageService_1.name);
        this.s3 = null;
        const accessKey = this.configService.get('AWS_ACCESS_KEY_ID');
        const secretKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
        this.bucket = this.configService.get('AWS_S3_BUCKET', '');
        this.localDir = '/tmp/storage';
        this.useS3 = !!(accessKey && secretKey && this.bucket);
        if (this.useS3) {
            this.s3 = new aws_sdk_1.default.S3({
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
                region: this.configService.get('AWS_REGION', 'us-east-1'),
            });
            this.logger.log('Using S3 storage');
        }
        else {
            this.logger.log('Using local storage');
        }
    }
    async upload(localPath, remotePath) {
        if (this.useS3 && this.s3) {
            const fileContent = await fs.readFile(localPath);
            const result = await this.s3.upload({
                Bucket: this.bucket,
                Key: remotePath,
                Body: fileContent,
            }).promise();
            return result.Location;
        }
        const destPath = path.join(this.localDir, remotePath);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(localPath, destPath);
        return destPath;
    }
    async download(remotePath, localPath) {
        if (this.useS3 && this.s3) {
            const result = await this.s3.getObject({
                Bucket: this.bucket,
                Key: remotePath,
            }).promise();
            await fs.writeFile(localPath, result.Body);
            return;
        }
        const srcPath = path.join(this.localDir, remotePath);
        await fs.copyFile(srcPath, localPath);
    }
    async delete(remotePath) {
        if (this.useS3 && this.s3) {
            await this.s3.deleteObject({
                Bucket: this.bucket,
                Key: remotePath,
            }).promise();
            return;
        }
        const filePath = path.join(this.localDir, remotePath);
        try {
            await fs.unlink(filePath);
        }
        catch { }
    }
    async getSignedUrl(remotePath, expirySeconds = 3600) {
        if (this.useS3 && this.s3) {
            return this.s3.getSignedUrlPromise('getObject', {
                Bucket: this.bucket,
                Key: remotePath,
                Expires: expirySeconds,
            });
        }
        return path.join(this.localDir, remotePath);
    }
    async exists(remotePath) {
        if (this.useS3 && this.s3) {
            try {
                await this.s3.headObject({ Bucket: this.bucket, Key: remotePath }).promise();
                return true;
            }
            catch {
                return false;
            }
        }
        try {
            await fs.access(path.join(this.localDir, remotePath));
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map