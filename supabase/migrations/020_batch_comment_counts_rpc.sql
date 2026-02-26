-- Batch comment counts RPC
-- Returns comment counts grouped by session_id for a given array of session IDs.
-- Used by getCommentCounts() to avoid fetching all comment rows into JS memory.

CREATE OR REPLACE FUNCTION get_batch_comment_counts(p_session_ids uuid[])
RETURNS TABLE(session_id uuid, comment_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.session_id, COUNT(*) AS comment_count
  FROM comments c
  WHERE c.session_id = ANY(p_session_ids)
  GROUP BY c.session_id;
$$;

-- Grant access to both authenticated and anonymous users (comments are public)
GRANT EXECUTE ON FUNCTION get_batch_comment_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_batch_comment_counts(uuid[]) TO anon;
