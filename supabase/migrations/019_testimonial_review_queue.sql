-- 5-star reviews become a Marketing review queue
-- A 5-star rating (direct or post-complaint survey) currently gets
-- auto-inserted into testimonials with enabled = TRUE, live on the
-- homepage immediately, with no human in the loop. Per the requirement
-- that "only Marketing decides which testimonials appear publicly",
-- this changes that to a queue: the row is still created automatically
-- (nothing is lost), but starts hidden (enabled = FALSE) with a new
-- review_status of 'pending'. Marketing reviews it from a new
-- "Outstanding Reviews" queue and explicitly publishes, rejects, or
-- archives it. Testimonials Marketing adds directly by hand are
-- unaffected, those still go live immediately, since a human already
-- made the call by typing it in.

ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'published'
  CHECK (review_status IN ('pending', 'published', 'rejected', 'archived'));

-- Anything already auto-published under the old behavior is left exactly
-- as-is (still live), this only changes what happens to NEW 5-star
-- reviews from now on, not a retroactive takedown of what's already shown.

CREATE OR REPLACE FUNCTION complaint_satisfaction_testimonial() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
  v_branch_id BIGINT;
BEGIN
  IF NEW.rating IS DISTINCT FROM 5 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(c.customer_name, u.full_name, 'A Ticano client'), c.branch_id
    INTO v_name, v_branch_id
  FROM complaints c
  LEFT JOIN users u ON u.id = c.customer_id
  WHERE c.id = NEW.complaint_id;

  INSERT INTO testimonials (name, rating, comment, branch_id, enabled, source, source_complaint_id, review_status)
  VALUES (
    COALESCE(v_name, 'A Ticano client'), NEW.rating,
    COALESCE(NULLIF(TRIM(NEW.comments), ''), 'Excellent, professional service from start to finish.'),
    v_branch_id, FALSE, 'survey', NEW.complaint_id, 'pending'
  )
  ON CONFLICT (source_complaint_id) WHERE source_complaint_id IS NOT NULL DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'complaint_satisfaction_testimonial failed for complaint %: %', NEW.complaint_id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION feedback_testimonial() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF NEW.rating IS DISTINCT FROM 5 THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_name FROM users WHERE id = NEW.customer_id;

  INSERT INTO testimonials (name, rating, comment, branch_id, enabled, source, source_complaint_id, review_status)
  VALUES (
    COALESCE(v_name, 'A Ticano client'), NEW.rating,
    COALESCE(NULLIF(TRIM(NEW.comment), ''), 'Excellent, professional service from start to finish.'),
    NEW.branch_id, FALSE, 'survey', NULL, 'pending'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'feedback_testimonial failed for feedback %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Marketing-only queue actions, publish/reject/archive all keep `enabled`
-- correctly in sync with review_status, since getPublicTestimonials()
-- still just checks enabled = true.
CREATE OR REPLACE FUNCTION set_testimonial_review_status(p_id BIGINT, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_marketing() THEN
    RAISE EXCEPTION 'Only Marketing can review testimonials';
  END IF;
  IF p_status NOT IN ('pending', 'published', 'rejected', 'archived') THEN
    RAISE EXCEPTION 'Invalid review status: %', p_status;
  END IF;

  UPDATE testimonials
  SET review_status = p_status,
      enabled = (p_status = 'published')
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_testimonial_review_status(BIGINT, TEXT) TO authenticated;
