#!/bin/bash
set -e

echo "Starting API server..."
cd ../api && pnpm run dev > /tmp/api.log 2>&1 &
API_PID=$!
sleep 5

echo "Starting app server..."
pnpm run dev > /tmp/app.log 2>&1 &
APP_PID=$!
sleep 5

echo "Waiting for servers to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:3001/api/health > /dev/null 2>&1 && \
     curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Servers are ready!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 1
done

echo "Running tests..."
SKIP_SERVER=true pnpm exec playwright test "$@"
TEST_RESULT=$?

echo "Cleaning up..."
kill $API_PID 2>/dev/null || true
kill $APP_PID 2>/dev/null || true

exit $TEST_RESULT
