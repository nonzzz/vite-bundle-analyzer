client-analyze:
	@echo "Analyzing client code..."
	@yarn run vite build src/client --config analyze.config.ts
	awk '{ print }' dist/client/stats.json > src/client/data.json

build-all: build-server build-client

build-client:
	@echo "Building client code..."
	@yarn run vite build src/client

build-server:
	@echo "Building server code..."
	@yarn run rollup --config rollup.config.ts --configPlugin swc3

dev-server:
	@echo "Starting server in development mode..."
	@yarn run rollup --config rollup.config.ts --configPlugin swc3 --watch

dev-client:
	@echo "Starting client in development mode..."
	@yarn run vite src/client

test:
	@echo "Running tests..."
	@yarn run test

lint:
	@echo "Linting code..."
	@yarn run lint
