install:
	@echo "Using berry to install dependencies..."
	corepack enable
	pnpm install

client-analyze:
	@echo "Analyzing client code..."
	@pnpm exec vite build src/client --config analyze.config.mts
	awk '{ print }' dist/client/stats.json > src/client/data.json

build-all:cleanup  build-server build-client

cleanup:
	-rm -rf dist

build-client:
	@echo "Building client code..."
	@pnpm exec vite build src/client

build-server:
	@echo "Building server code..."
	@pnpm exec rollup --config rollup.config.mts --configPlugin swc3

dev-server:
	@echo "Starting server in development mode..."
	@pnpm exec rollup --config rollup.config.mts --configPlugin swc3 --watch

dev-client:
	@echo "Starting client in development mode..."
	@pnpm exec vite src/client

test:
	@echo "Running tests..."
	@pnpm run test

lint:
	@echo "Linting code..."
	@pnpm run lint

format:
	@echo "Formatting code..."
	pnpm exec dprint fmt
