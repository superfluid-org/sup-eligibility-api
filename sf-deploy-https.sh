#!/bin/bash

# This is a simple tool for deploying simple applications (mainly nodejs based ones) to the SF sandbox.
# If run without any env vars set, it will do this on the server:
# - clone the git repository specified in package.json
# - (if a local file .env.prod exists) create a file .env on the server with the same content
# - run "npm ci && npm run build"
# - create a systemd service for the application and start it (command: "npm run start")
# - (if a local file cron.json exists) setup cron jobs accordingly
#
# Requirements for this to work:
# - the caller has ssh access to gadgets@main.s.superfluid.dev
# - an application name is specified via env var APP_NAME or in a file package.json
# - a git url is specified via env var GIT_URL or in a file package.json
# - the git url is a public repository
# - (if using systemd) there's a package.json with a script target "start"
#
# Configuration options:
# - .nvmrc file signalling the nodejs version to be used (default: v20)
# - env var NO_SERVICE if the application is base on cronjobs only
# - env var INSTALL_CMD to specify the install command (default: "npm ci && npm run build")
# - env var ENV_FILE which contains the env to be used (default: .env.prod). On the server it will always be named .env
# - env var CRON_FILE which specified cronjobs to be installed (default: cron.json)
#
# Webservice URL:
# If the application exposes a webservice, there shall be an env var "PORT" in the .env.prod.
# You may want to use a custom port number (e.g. NOT the usual 3000) to avoid conflicts with other services.
# If PORT is specified, the service will be made available at the domain https://<app-name>.s.superfluid.dev
# It can take up to 5 minutes for that domain mapping to be established.
#
# Cronjobs:
# - .nvmrc file signalling the wanted node version
# - .env.prod (or file specified in env var ENV_FILE) with env vars to be used in production
# - custom install command(s) in env var INSTALL_CMD (default: "npm ci && npm run build")
# - NO_SERVICE env var to skip systemd service setup and start
# - cron.json file to set up cron jobs (see documentation for format)
#
# cron.json example:
# [
#   {
#     "schedule": "0 * * * *",
#     "command": "API_KEY=123 ./do-something-1.sh"
#   },
#   {
#     "schedule": "0 2 * * *",
#     "command": "./do-something-2.sh"
#   }
# ]
# This would run ./do-something-1.sh hourly and ./do-something-2.sh daily.
#
# Monitoring:
# In order to look at the live logs, you can run
# sf-monitor-gadget <app-name>
#

set -eu

SSH_HOST=gadgets@main.s.superfluid.dev
APP_NAME=${APP_NAME:-$(cat package.json | jq -r '.name')}
GIT_URL=${GIT_URL:-$(cat package.json | jq -r '.repository.url')}
ENV_FILE=${ENV_FILE:-.env.prod}
INSTALL_CMD=${INSTALL_CMD:-"node --version && npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build"}
SERVICE_FILE=$APP_NAME.service
NO_SERVICE=${NO_SERVICE:-""}
CRON_FILE=${CRON_FILE:-"cron.json"}

echo "════════════════════════════════════════════════════════════════════════"
echo "📋 [LOCAL] DEPLOYMENT CONFIGURATION"
echo "────────────────────────────────────────────────────────────────────────"
echo "📦 App name: $APP_NAME"
if [ -z "$APP_NAME" ] || [[ "$APP_NAME" =~ ' ' ]]; then
  echo "❌ [LOCAL] Invalid app name"
  exit 1
fi

echo "🔗 Git URL: $GIT_URL"
if [ -z "$GIT_URL" ]; then
  echo "❌ [LOCAL] Invalid git url"
  exit 1
fi

echo "📄 Environment file: $ENV_FILE"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ [LOCAL] Environment file not found"
  exit 1
fi

echo "🔧 Install command: $INSTALL_CMD"
echo "────────────────────────────────────────────────────────────────────────"

# Copy environment file if it exists
if [ -f "$ENV_FILE" ]; then
  echo "📤 [LOCAL] Uploading $ENV_FILE to the server as .env.$APP_NAME"
  scp $ENV_FILE $SSH_HOST:~/.env.$APP_NAME
fi

# Copy cron file if it exists
if [ -f "$CRON_FILE" ]; then
  echo "📤 [LOCAL] Uploading $CRON_FILE to the server as .cron.$APP_NAME.json"
  scp $CRON_FILE $SSH_HOST:~/.cron.$APP_NAME.json
fi

echo "════════════════════════════════════════════════════════════════════════"
echo "🚀 STARTING REMOTE EXECUTION ON $SSH_HOST"
echo "════════════════════════════════════════════════════════════════════════"

# if any of the commands fails, don't continue
ssh -q -T $SSH_HOST "/bin/bash --noprofile --norc" <<EOF
set -e
set -u
. ./.profile
. .nvm/nvm.sh

echo "📋 [REMOTE] Beginning deployment of $APP_NAME"

# (conditional) first time setup

# if directory with app name doesn't exist, clone the repo
if [ ! -d "$APP_NAME" ]; then
  echo "🔄 [REMOTE] First-time setup: Cloning repository..."
  git clone $GIT_URL $APP_NAME
fi

# if service file doesn't exist and NO_SERVICE is not set, copy it from the template
if [ -z "$NO_SERVICE" ] && [ ! -f "services/$SERVICE_FILE" ]; then
  echo "⚙️  [REMOTE] Creating systemd service file from template"
  cp template.service services/$SERVICE_FILE
  sed -i "s|Description=|Description=$APP_NAME|" services/$SERVICE_FILE
  sed -i "s|WorkingDirectory=|WorkingDirectory=/home/gadgets/$APP_NAME|" services/$SERVICE_FILE
  
  echo "⚙️  [REMOTE] Enabling systemd service"
  systemctl --user daemon-reload
  sleep 1
  systemctl --user enable $SERVICE_FILE
fi

echo "────────────────────────────────────────────────────────────────────────"
echo "🔄 [REMOTE] Updating application"
echo "────────────────────────────────────────────────────────────────────────"

# if there's an .env.$APP_NAME, use it
if [ -f ".env.$APP_NAME" ]; then
  echo "📄 [REMOTE] Setting up environment using .env.$APP_NAME"
  cp .env.$APP_NAME $APP_NAME/.env
  rm .env.$APP_NAME
else
  echo "❗ [REMOTE] No .env.$APP_NAME found"
fi

echo "📂 [REMOTE] Entering application directory: $APP_NAME"
cd $APP_NAME
echo "🔄 [REMOTE] Pulling latest code"
git fetch && git reset --hard origin/main
if [ -f .nvmrc ]; then
  echo "🔧 [REMOTE] Using Node.js version from .nvmrc"
  nvm use
else
  echo "🔧 [REMOTE] No .nvmrc provided, using default Node.js version"
fi

echo "🔨 [REMOTE] Running installation command: $INSTALL_CMD"
$INSTALL_CMD
cd

# Handle cron jobs setup if cron.json exists
if [ -f ".cron.$APP_NAME.json" ]; then
  echo "────────────────────────────────────────────────────────────────────────"
  echo "⏱️  [REMOTE] Setting up cron jobs"
  echo "────────────────────────────────────────────────────────────────────────"
  
  # Capture the Node.js version in the SSH session
  NODE_VERSION=\$(node -v)
  
  # Create new crontab: keep existing entries but remove this app's entries
  (crontab -l 2>/dev/null | grep -v "# $APP_NAME job" || echo "") > /tmp/crontab
  
  # Add new entries for this app with the correct PATH
  jq -r '.[] | .schedule + " cd /home/gadgets/'$APP_NAME' && PATH=/home/gadgets/.nvm/versions/node/'\$NODE_VERSION'/bin:\$PATH " + .command + " # '$APP_NAME' job"' ".cron.$APP_NAME.json" >> /tmp/crontab
  
  # Install the new crontab
  crontab /tmp/crontab
  rm /tmp/crontab ".cron.$APP_NAME.json"
  
  echo "✅ [REMOTE] Cron jobs updated successfully"
fi

# Only restart and check service status if NO_SERVICE is not set
if [ -z "$NO_SERVICE" ]; then
  echo "────────────────────────────────────────────────────────────────────────"
  echo "🔄 [REMOTE] (Re)starting service"
  echo "────────────────────────────────────────────────────────────────────────"
  systemctl --user restart $SERVICE_FILE
  echo "📊 [REMOTE] Service status:"
  systemctl --user -n 50 status $SERVICE_FILE
fi
EOF

echo "════════════════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETED"
echo "════════════════════════════════════════════════════════════════════════"