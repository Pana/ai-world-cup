ALTER TABLE prediction_runs
  ADD COLUMN reasoning_config JSON NULL AFTER request_payload,
  ADD COLUMN reasoning_tokens INT UNSIGNED NULL AFTER output_tokens,
  ADD COLUMN total_tokens INT UNSIGNED NULL AFTER reasoning_tokens;
