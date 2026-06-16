#!/bin/sh
set -eu

# Regenerate the browser runtime config (window.__ENV__) from the container
# environment. This is what lets a single image serve every deployment: the
# values are read at container start, NOT baked in at `docker build` time.
#
# Configure a container by passing environment variables, e.g.:
#   docker run -e BFF_URL=https://bff.example.com ghcr.io/<owner>/workflow-frontend
#
# BFF_URL is the canonical name; NEXT_PUBLIC_BFF_URL is accepted as a fallback
# for parity with the build-time / local-dev variable.

BFF_URL="${BFF_URL:-${NEXT_PUBLIC_BFF_URL:-}}"

ENV_FILE="${ENV_FILE:-/app/public/env.js}"

cat > "$ENV_FILE" <<EOF
window.__ENV__ = {
  BFF_URL: "${BFF_URL}",
};
EOF

echo "docker-entrypoint: wrote ${ENV_FILE} (BFF_URL=${BFF_URL:-<empty>})"

exec "$@"
