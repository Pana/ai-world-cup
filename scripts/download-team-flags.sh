#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
manifest="$project_root/assets/flags/manifest.json"

jq -r '.[] | [.flagCode, .slug] | @tsv' "$manifest" |
  while IFS=$'\t' read -r flag_code slug; do
    curl --fail --silent --show-error \
      "https://flagcdn.com/${flag_code}.svg" \
      --output "$project_root/assets/flags/${slug}.svg"
  done
