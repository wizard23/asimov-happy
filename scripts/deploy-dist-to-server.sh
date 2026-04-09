#!/usr/bin/env bash
# use bash "stric mode"
# explanation for it can be found here: http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -xeuo pipefail


############## config section ####################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

# the folder that will be deployed
DIST_DIR="$PROJECT_ROOT/code/v001/packages/web/dist"

# real secrets live here:
ENV_FILE="$PROJECT_ROOT/.secrets/deploy.env"


############## implementation section #############

if [[ ! -d "$DIST_DIR" ]]; then
  echo "ERROR: dist folder not found at: $DIST_DIR"
  echo "Did you run the build first?"
  echo "  npm run build"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Create it like this:"
  echo "  cp $ENV_FILE.example $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

# : never fails but if the expansion fails then the script exits because set -e is enabled
: "${DEPLOY_HOST:?DEPLOY_HOST is not set in deploy.env}"
: "${DEPLOY_USER:?DEPLOY_USER is not set in deploy.env}"
: "${DEPLOY_TARGET_DIR:?DEPLOY_TARGET_DIR is not set in deploy.env}"

SSH_PORT="${SSH_PORT:-22}"



# # ensure directory exists
# ssh -p "$SSH_PORT" "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p '$DEPLOY_TARGET_DIR'"

# copy the files
rsync -az -v -e "ssh -p $SSH_PORT" "$DIST_DIR/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_TARGET_DIR}/"