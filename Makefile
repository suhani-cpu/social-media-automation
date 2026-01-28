.PHONY: help dev-up dev-down dev-logs dev-build prod-up prod-down prod-logs prod-build clean db-migrate db-studio

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo '$(BLUE)Available commands:$(NC)'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# Development commands
dev-up: ## Start development environment
	@echo '$(BLUE)Starting development environment...$(NC)'
	docker-compose -f docker-compose.dev.yml up -d
	@echo '$(GREEN)✓ Development environment started$(NC)'
	@echo '$(BLUE)Backend API:$(NC) http://localhost:3000'
	@echo '$(BLUE)Frontend:$(NC) http://localhost:3001'

dev-down: ## Stop development environment
	@echo '$(BLUE)Stopping development environment...$(NC)'
	docker-compose -f docker-compose.dev.yml down
	@echo '$(GREEN)✓ Development environment stopped$(NC)'

dev-logs: ## View development logs
	docker-compose -f docker-compose.dev.yml logs -f

dev-build: ## Rebuild development containers
	@echo '$(BLUE)Rebuilding development containers...$(NC)'
	docker-compose -f docker-compose.dev.yml build --no-cache
	@echo '$(GREEN)✓ Containers rebuilt$(NC)'

dev-restart: ## Restart development environment
	@echo '$(BLUE)Restarting development environment...$(NC)'
	docker-compose -f docker-compose.dev.yml restart
	@echo '$(GREEN)✓ Environment restarted$(NC)'

# Production commands
prod-up: ## Start production environment
	@echo '$(BLUE)Starting production environment...$(NC)'
	docker-compose -f docker-compose.prod.yml up -d
	@echo '$(GREEN)✓ Production environment started$(NC)'

prod-down: ## Stop production environment
	@echo '$(BLUE)Stopping production environment...$(NC)'
	docker-compose -f docker-compose.prod.yml down
	@echo '$(GREEN)✓ Production environment stopped$(NC)'

prod-logs: ## View production logs
	docker-compose -f docker-compose.prod.yml logs -f

prod-build: ## Rebuild production containers
	@echo '$(BLUE)Rebuilding production containers...$(NC)'
	docker-compose -f docker-compose.prod.yml build --no-cache
	@echo '$(GREEN)✓ Containers rebuilt$(NC)'

# Database commands
db-migrate: ## Run database migrations
	@echo '$(BLUE)Running database migrations...$(NC)'
	cd backend && npm run prisma:migrate
	@echo '$(GREEN)✓ Migrations completed$(NC)'

db-studio: ## Open Prisma Studio
	@echo '$(BLUE)Opening Prisma Studio...$(NC)'
	cd backend && npm run prisma:studio

db-reset: ## Reset database (WARNING: deletes all data)
	@echo '$(RED)⚠ This will delete all data!$(NC)'
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd backend && npx prisma migrate reset --force; \
		echo '$(GREEN)✓ Database reset$(NC)'; \
	fi

# Clean commands
clean: ## Remove all containers, volumes, and images
	@echo '$(RED)⚠ This will remove all Docker containers, volumes, and images!$(NC)'
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f docker-compose.dev.yml down -v; \
		docker-compose -f docker-compose.prod.yml down -v; \
		docker system prune -af; \
		echo '$(GREEN)✓ Cleanup completed$(NC)'; \
	fi

# Status commands
status: ## Show container status
	@echo '$(BLUE)Container Status:$(NC)'
	@docker-compose -f docker-compose.dev.yml ps

ps: status ## Alias for status

# Install commands
install: ## Install dependencies
	@echo '$(BLUE)Installing backend dependencies...$(NC)'
	cd backend && npm install
	@echo '$(BLUE)Installing frontend dependencies...$(NC)'
	cd frontend && npm install || echo 'Frontend not ready yet'
	@echo '$(GREEN)✓ Dependencies installed$(NC)'

# Setup commands
setup: ## Initial setup (install + env + migrate)
	@echo '$(BLUE)Running initial setup...$(NC)'
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo '$(GREEN)✓ Created .env file (please configure it)$(NC)'; \
	fi
	@make install
	@make db-migrate
	@echo '$(GREEN)✓ Setup completed$(NC)'
	@echo '$(BLUE)Next steps:$(NC)'
	@echo '  1. Configure .env file with your credentials'
	@echo '  2. Run: make dev-up'

# Test commands
test: ## Run tests
	@echo '$(BLUE)Running tests...$(NC)'
	cd backend && npm test

test-watch: ## Run tests in watch mode
	cd backend && npm run test:watch
