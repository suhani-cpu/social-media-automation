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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AccountsService = class AccountsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAll(userId) {
        const accounts = await this.prisma.socialAccount.findMany({
            where: { userId },
            select: {
                id: true,
                platform: true,
                username: true,
                accountId: true,
                status: true,
                tokenExpiry: true,
                createdAt: true,
            },
        });
        return { accounts };
    }
    async connect(userId, data) {
        const account = await this.prisma.socialAccount.create({
            data: {
                userId,
                platform: data.platform,
                accountId: data.accountId,
                username: data.username,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                metadata: data.metadata,
                status: 'ACTIVE',
            },
        });
        return {
            message: 'Account connected successfully',
            account: {
                id: account.id,
                platform: account.platform,
                username: account.username,
                status: account.status,
            },
        };
    }
    async disconnect(userId, id) {
        const account = await this.prisma.socialAccount.findFirst({
            where: { id, userId },
        });
        if (!account) {
            throw new common_1.NotFoundException('Account not found');
        }
        await this.prisma.socialAccount.delete({ where: { id } });
        return { message: 'Account disconnected successfully' };
    }
};
exports.AccountsService = AccountsService;
exports.AccountsService = AccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AccountsService);
//# sourceMappingURL=accounts.service.js.map