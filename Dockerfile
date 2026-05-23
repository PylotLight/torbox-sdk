# --- Build Stage ---
FROM oven/bun:slim AS builder
WORKDIR /app

# Install dependencies only
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build the application into a single file
COPY . .
RUN bun build ./src/index.ts --outfile=dist/index.js --target=bun

# --- Runtime Stage ---
FROM oven/bun:slim
WORKDIR /app

# Copy only the compiled binary and necessary runtime files from builder
COPY --from=builder /app/dist/index.js ./index.js
COPY --from=builder /app/package.json ./package.json

# Create download directory to ensure permissions are correct
RUN mkdir -p /app/downloads && chown -R bun:bun /app

USER bun
# We no longer need to expose 3000 as this is a background worker
CMD ["bun", "run", "index.js"]
