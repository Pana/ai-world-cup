#!/usr/bin/env bash

set -euo pipefail

package_version="1.91.0"
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
archive="${TMPDIR:-/tmp}/lobe-icons-${package_version}.tgz"
extract_dir="${TMPDIR:-/tmp}/lobe-icons-${package_version}"
output_dir="$project_root/assets/models"

curl --fail --silent --show-error \
  "https://registry.npmjs.org/@lobehub/icons-static-svg/-/icons-static-svg-${package_version}.tgz" \
  --output "$archive"

rm -rf "$extract_dir"
mkdir -p "$extract_dir" "$output_dir"

tar -xzf "$archive" -C "$extract_dir" \
  package/icons/openai.svg \
  package/icons/claude-color.svg \
  package/icons/gemini-color.svg \
  package/icons/grok.svg \
  package/icons/kimi-color.svg \
  package/icons/deepseek-color.svg \
  package/icons/zhipu-color.svg \
  package/icons/qwen-color.svg \
  package/icons/doubao-color.svg

cp "$extract_dir/package/icons/openai.svg" "$output_dir/gpt.svg"
cp "$extract_dir/package/icons/claude-color.svg" "$output_dir/claude.svg"
cp "$extract_dir/package/icons/gemini-color.svg" "$output_dir/gemini.svg"
cp "$extract_dir/package/icons/grok.svg" "$output_dir/grok.svg"
cp "$extract_dir/package/icons/kimi-color.svg" "$output_dir/kimi.svg"
cp "$extract_dir/package/icons/deepseek-color.svg" "$output_dir/deepseek.svg"
cp "$extract_dir/package/icons/zhipu-color.svg" "$output_dir/glm.svg"
cp "$extract_dir/package/icons/qwen-color.svg" "$output_dir/qianwen.svg"
cp "$extract_dir/package/icons/doubao-color.svg" "$output_dir/doubao.svg"
