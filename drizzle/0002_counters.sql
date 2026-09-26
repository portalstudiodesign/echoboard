-- post.vote_count / post.comment_count are maintained by the database, so they stay correct
-- no matter how rows change (app code, cascading user deletion, manual fixes).
CREATE FUNCTION sync_post_vote_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post SET vote_count = vote_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE post SET vote_count = vote_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER vote_count_sync AFTER INSERT OR DELETE ON vote
  FOR EACH ROW EXECUTE FUNCTION sync_post_vote_count();
--> statement-breakpoint
CREATE FUNCTION sync_post_comment_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE post SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER comment_count_sync AFTER INSERT OR DELETE ON comment
  FOR EACH ROW EXECUTE FUNCTION sync_post_comment_count();
