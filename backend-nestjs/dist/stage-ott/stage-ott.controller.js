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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageOttController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const stage_ott_service_1 = require("./stage-ott.service");
let StageOttController = class StageOttController {
    constructor(stageOttService) {
        this.stageOttService = stageOttService;
    }
    listContent(page, perPage, sortBy, sortOrder, dialect) {
        return this.stageOttService.listContent({
            page: page ? parseInt(page, 10) : 1,
            perPage: perPage ? parseInt(perPage, 10) : 20,
            sortBy: sortBy || 'createdAt',
            sortOrder: sortOrder || 'desc',
            dialect,
        });
    }
    importContent(user, body) {
        return this.stageOttService.importContent(user.id, body);
    }
    importMultiple(user, body) {
        return this.stageOttService.importMultiple(user.id, body.items);
    }
};
exports.StageOttController = StageOttController;
__decorate([
    (0, common_1.Get)('content'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('perPage')),
    __param(2, (0, common_1.Query)('sortBy')),
    __param(3, (0, common_1.Query)('sortOrder')),
    __param(4, (0, common_1.Query)('dialect')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], StageOttController.prototype, "listContent", null);
__decorate([
    (0, common_1.Post)('import'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StageOttController.prototype, "importContent", null);
__decorate([
    (0, common_1.Post)('import-multiple'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StageOttController.prototype, "importMultiple", null);
exports.StageOttController = StageOttController = __decorate([
    (0, common_1.Controller)('stage-ott'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [stage_ott_service_1.StageOttService])
], StageOttController);
//# sourceMappingURL=stage-ott.controller.js.map