-- name: insert_history_entry :exec
INSERT INTO request_history (
  collection_uid, collection_name, item_pathname, request_name, method, url,
  status, status_text, error, duration_ms, size_bytes, sent_at,
  request_file_id, response_file_id, body_file_id
) VALUES (
  @collection_uid, @collection_name, @item_pathname, @request_name, @method, @url,
  @status, @status_text, @error, @duration_ms, @size_bytes, @sent_at,
  @request_file_id, @response_file_id, @body_file_id
);

-- Newest first. `before_sent_at` / `before_id` are the keyset cursor (both NULL for the first page);
-- `search` is NULL or a case-insensitive substring of the URL, request name, method or status.
-- name: list_history :many
SELECT
  id, collection_uid, collection_name, item_pathname, request_name, method, url,
  status, status_text, error, duration_ms, size_bytes, sent_at
FROM request_history
WHERE (@before_sent_at IS NULL OR sent_at < @before_sent_at OR (sent_at = @before_sent_at AND id < @before_id))
  AND (
    @search IS NULL
    OR instr(lower(url), lower(@search)) > 0
    OR instr(lower(request_name), lower(@search)) > 0
    OR instr(lower(method), lower(@search)) > 0
    OR instr(lower(collection_name), lower(@search)) > 0
    OR instr(CAST(status AS TEXT), @search) > 0
  )
ORDER BY sent_at DESC, id DESC
LIMIT @limit;

-- name: get_history_entry :one
SELECT
  request_history.id AS id,
  request_history.collection_uid AS collection_uid,
  request_history.collection_name AS collection_name,
  request_history.item_pathname AS item_pathname,
  request_history.request_name AS request_name,
  request_history.method AS method,
  request_history.url AS url,
  request_history.status AS status,
  request_history.status_text AS status_text,
  request_history.error AS error,
  request_history.duration_ms AS duration_ms,
  request_history.size_bytes AS size_bytes,
  request_history.sent_at AS sent_at,
  request_history.request_file_id AS request_file_id,
  request_file.data AS request_data,
  request_history.response_file_id AS response_file_id,
  response_file.data AS response_data,
  request_history.body_file_id AS body_file_id,
  body_file.data AS body_data
FROM request_history
LEFT JOIN files AS request_file ON request_file.id = request_history.request_file_id
LEFT JOIN files AS response_file ON response_file.id = request_history.response_file_id
LEFT JOIN files AS body_file ON body_file.id = request_history.body_file_id
WHERE request_history.id = @id;

-- Rows past the retention limits (older than `cutoff`, or beyond the newest `keep`), a batch at a time.
-- name: list_history_prune_candidates :many
SELECT id, request_file_id, response_file_id, body_file_id
FROM request_history
WHERE sent_at < @cutoff
  OR id NOT IN (SELECT id FROM request_history ORDER BY sent_at DESC, id DESC LIMIT @keep)
LIMIT 200;

-- name: get_history_file_ids :one
SELECT request_file_id, response_file_id, body_file_id FROM request_history WHERE id = @id;

-- name: list_history_file_ids :many
SELECT request_file_id, response_file_id, body_file_id FROM request_history LIMIT 5000;

-- name: delete_history_entry :exec
DELETE FROM request_history WHERE id = @id;

-- name: delete_all_history :exec
DELETE FROM request_history;
