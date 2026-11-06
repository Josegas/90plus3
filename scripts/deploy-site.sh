#!/usr/bin/env bash
# Manual Amplify Hosting deployment of site/ (no GitHub OAuth needed).
# Usage: APP_ID=xxxx BRANCH=main ./scripts/deploy-site.sh
set -euo pipefail

APP_ID="${APP_ID:?set APP_ID}"
BRANCH="${BRANCH:-main}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ZIP="$(mktemp -t 90plus3-site-XXXXXX).zip"

( cd "$ROOT/site" && zip -qr "$ZIP" . -x '.*' )

read -r JOB_ID ZIP_URL < <(
  aws amplify create-deployment --app-id "$APP_ID" --branch-name "$BRANCH" \
    --query '[jobId,zipUploadUrl]' --output text
)

echo "uploading $(du -h "$ZIP" | cut -f1) → job $JOB_ID"
curl -sS -o /dev/null -T "$ZIP" "$ZIP_URL"
aws amplify start-deployment --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" >/dev/null

for _ in $(seq 1 40); do
  STATUS=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" \
    --query 'job.summary.status' --output text)
  echo "  $STATUS"
  case "$STATUS" in
    SUCCEED) echo "https://${BRANCH}.${APP_ID}.amplifyapp.com"; exit 0 ;;
    FAILED|CANCELLED) echo "deployment $STATUS" >&2; exit 1 ;;
  esac
  sleep 5
done

echo "timed out waiting for deployment" >&2
exit 1
