ROLLUP = ./node_modules/.bin/rollup --config rollup.config.mts --configPlugin swc3
TSX = ./node_modules/.bin/tsx

install:
	@echo "Using berry to install dependencies..."
	corepack enable
	pnpm install

client-analyze:
	@echo "Analyzing client code..."
	@pnpm exec vite build src/client --config analyze.config.mts
	awk '{ print }' dist/client/stats.json > src/client/data.json

server-analyze:
	@echo "Analyzing server code..."
	-rm -rf analysis
	./node_modules/.bin/rollup --config analyze.server.mjs

build-all:cleanup build-server cleaup-client

cleaup-client:
	-rm -rf dist/client

cleanup:
	-rm -rf dist

build-client:
	@echo "Building client code..."
	@pnpm exec vite build src/client
	make clean-html

build-server: build-client
	@echo "Building server code..."
	@$(TSX) ./pre-compile.mts > dist/html.mjs
	@$(ROLLUP)
	-rm -rf dist/cli.mjs
	awk '{ print }' bin.txt > dist/bin.js


dev-server:
	@echo "Starting server in development mode..."
	@export NODE_ENV=development && $(ROLLUP) --watch

dev-client:
	@echo "Starting client in development mode..."
	@pnpm exec vite src/client

test:
	@echo "Running tests..."
	@pnpm exec vitest --coverage

lint:
	@echo "Linting code..."
	@pnpm exec eslint . --fix

format:
	@echo "Formatting code..."
	pnpm exec dprint fmt

clean-html:
	@echo "Cleaning up html file..."
	@awk 'BEGIN \
		{ RS=""; FS=""; ORS="" } \
		{ \
			gsub(/<script[^>]*>[\\s\\S]*?<\/script>/, ""); \
			gsub(/<link[^>]*rel="stylesheet"[^>]*>/, ""); \
			gsub(/<title>[^<]*<\/title>/, ""); \
			gsub(/[ \t\n\r]+/, " "); \
			print \
        } \
    ' dist/client/index.html > dist/client/index.tmp && \
    mv dist/client/index.tmp dist/client/index.html
