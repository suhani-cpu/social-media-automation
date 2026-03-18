"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DriveController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const drive_service_1 = require("./drive.service");
let DriveController = DriveController_1 = class DriveController {
    constructor(driveService, configService) {
        this.driveService = driveService;
        this.configService = configService;
        this.logger = new common_1.Logger(DriveController_1.name);
    }
    startAuth(user) {
        return this.driveService.startAuth(user.id);
    }
    async handleCallback(code, state, oauthError, res) {
        const frontendUrl = this.configService.get('FRONTEND_URL');
        try {
            if (oauthError) {
                throw new Error(`Google OAuth error: ${oauthError}`);
            }
            if (!code || !state) {
                throw new Error('Missing code or state parameter');
            }
            const redirectUrl = await this.driveService.handleCallback(code, state);
            return res.redirect(redirectUrl);
        }
        catch (error) {
            this.logger.error(`Drive callback error: ${error?.message || error}`);
            const errorMsg = encodeURIComponent(error?.message || 'Unknown error');
            return res.redirect(`${frontendUrl}/dashboard/accounts?drive=error&drive_error=${errorMsg}`);
        }
    }
    getStatus(user) {
        return this.driveService.getStatus(user.id);
    }
    disconnect(user) {
        return this.driveService.disconnect(user.id);
    }
    listFolders(user, parentId) {
        return this.driveService.listFolders(user.id, parentId);
    }
    listFiles(user, folderId, videosOnly = 'true') {
        return this.driveService.listFiles(user.id, folderId, videosOnly === 'true');
    }
    importVideo(user, body) {
        return this.driveService.importVideo(user.id, body.fileId, body.title);
    }
    importBatch(user, body) {
        return this.driveService.importMultiple(user.id, body.fileIds);
    }
    importMultiple(user, body) {
        return this.driveService.importMultiple(user.id, body.fileIds);
    }
    getFileMetadata(user, fileId) {
        return this.driveService.getFileMetadata(user.id, fileId);
    }
};
exports.DriveController = DriveController;
__decorate([
    (0, common_1.Get)('auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "startAuth", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], DriveController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('disconnect'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Get)('folders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('parentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "listFolders", null);
__decorate([
    (0, common_1.Get)('files'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('folderId')),
    __param(2, (0, common_1.Query)('videosOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "listFiles", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "importVideo", null);
__decorate([
    (0, common_1.Post)('import/batch'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "importBatch", null);
__decorate([
    (0, common_1.Post)('import/multiple'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "importMultiple", null);
__decorate([
    (0, common_1.Get)('files/:fileId/metadata'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('fileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "getFileMetadata", null);
exports.DriveController = DriveController = DriveController_1 = __decorate([
    (0, common_1.Controller)('drive'),
    __metadata("design:paramtypes", [drive_service_1.DriveService,
        config_1.ConfigService])
], DriveController);
//# sourceMappingURL=drive.controller.js.map