-- staff notification triggers, complaint auto-routing,
-- testimonial auto-publish, richer "Potential Clients" data
-- Fixes four related gaps found during a support review:
--
-- 1. Complaints/escalations never reached the assigned PM in real time.
-- `submitComplaint()` never set `assigned_pm_id`, even when the
-- submitting customer already had a Portfolio Manager on their
-- `client_profiles` row, the complaint sat invisible to that PM
-- until a Service Manager manually assigned it from the queue.
-- `escalateComplaint()` updated `complaint_escalations` but never
-- wrote a `notifications` row, so Service Manager/Director/Admin had
-- no live signal an escalation had happened, only the badge count
-- if/when they happened to reopen the Complaints tab.
-- Fix: trigger functions on `complaints` and `complaint_escalations`
-- that (a) auto-fill `assigned_pm_id` from the customer's
-- `client_profiles.assigned_pm_id` at submission time, and
-- (b) insert real notifications for the assigned PM, Service
-- Manager, Director and Admin. These are SECURITY DEFINER, same
-- pattern as notify_new_client_signup() in migration 010, because a
-- customer's own session is blocked by `notifications_insert_staff`
-- from writing a staff-facing notification directly.
--
-- 2. "How can we improve?" suggestions (`improvement_feedback`) landed
-- in the table with no notification at all, the Service Manager
-- Feedback Dashboard only ever showed them after a manual refresh.
-- Fix: trigger notifies `service_manager` and `director` (the two
-- audiences the in-app copy already promises these route to) the
-- moment one is submitted, and the table is realtime-subscribed
-- client-side (see ServiceManagerDashboard.jsx).
--
-- 3. Five-star ratings never became homepage testimonials, despite the
-- schema already being designed for it, `testimonials.source` has
-- a 'survey' value described in its own column comment as
-- "auto-picked from a 5-star complaint_satisfaction response", and
-- a unique index on `source_complaint_id` exists specifically to
-- stop a survey response from generating duplicate testimonials.
-- Nothing ever populated it. Fix: triggers on `complaint_satisfaction`
-- and `feedback` that auto-insert an enabled testimonial the moment
-- a 5-star rating is saved.
--
-- 4. The "Potential Clients" (leads) list only ever captured
-- name/phone/branch/product/referral, no company, industry, or
-- engagement-scope fields, so a PM had no application context
-- without opening another screen. Fix: three new columns on `leads`.
--
-- Run this after 001-010. Safe to re-run.

-- 1. Leads, richer application context
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS project_scope TEXT;

-- 2. Complaints, auto-route to the client's existing PM at submission
CREATE OR REPLACE FUNCTION complaints_auto_assign_pm() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_pm_id IS NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT assigned_pm_id INTO NEW.assigned_pm_id
    FROM client_profiles WHERE user_id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_auto_assign_pm ON complaints;
CREATE TRIGGER trg_complaints_auto_assign_pm
  BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION complaints_auto_assign_pm();

-- Notify the assigned PM (if any) and Service Manager the moment a
-- complaint is created, so it appears on the right dashboard instantly
-- instead of waiting for someone to open the queue and manually assign.
CREATE OR REPLACE FUNCTION complaints_notify_new() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_pm_id IS NOT NULL THEN
    -- 'complaints' matches the PM dashboard's own tab id (PmDashboard.jsx PM_TAB_IDS).
    INSERT INTO notifications (user_id, type, title, body, link_tab) VALUES
      (NEW.assigned_pm_id, 'complaint', 'New complaint from your client',
       COALESCE(NEW.customer_name, 'A client') || ' submitted a complaint (' || NEW.ticket || ').', 'complaints');
  ELSE
    -- 'Complaints' matches the Service Manager dashboard's tab id (ServiceManagerDashboard.jsx activeTab values).
    INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
      ('service_manager', 'complaint', 'New unassigned complaint',
       COALESCE(NEW.customer_name, 'A client') || ' submitted a complaint (' || NEW.ticket || ') with no Portfolio Manager on file.', 'Complaints');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_notify_new ON complaints;
CREATE TRIGGER trg_complaints_notify_new
  AFTER INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION complaints_notify_new();

-- 3. Escalations, notify the full chain of command in real time
CREATE OR REPLACE FUNCTION complaint_escalations_notify() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket TEXT;
  v_customer TEXT;
  v_pm_id BIGINT;
BEGIN
  SELECT ticket, customer_name, assigned_pm_id INTO v_ticket, v_customer, v_pm_id
  FROM complaints WHERE id = NEW.complaint_id;

  -- Chain of command: whoever it was escalated to, plus Director
  -- (both have an 'Escalations' tab), plus Admin for full oversight
  -- (no dedicated tab yet, so no deep-link, see FIX_LOG), plus the
  -- assigned PM (a private ping confirming the escalation registered,
  -- deep-linked to their own 'complaints' tab).
  INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
    (COALESCE(NEW.escalated_to::TEXT, 'service_manager')::user_role, 'escalation', 'Complaint escalated',
     COALESCE(v_ticket, 'A complaint') || ' (' || COALESCE(v_customer, 'client') || ') was escalated by '
       || COALESCE(NEW.escalated_by, 'staff') || '. Reason: ' || NEW.reason, 'Escalations'),
    ('director', 'escalation', 'Complaint escalated',
     COALESCE(v_ticket, 'A complaint') || ' (' || COALESCE(v_customer, 'client') || ') was escalated.', 'Escalations'),
    ('admin', 'escalation', 'Complaint escalated',
     COALESCE(v_ticket, 'A complaint') || ' (' || COALESCE(v_customer, 'client') || ') was escalated.', NULL);

  IF v_pm_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link_tab) VALUES
      (v_pm_id, 'escalation', 'Your complaint was escalated',
       COALESCE(v_ticket, 'Your complaint') || ' has been escalated to ' || COALESCE(NEW.escalated_to::TEXT, 'management') || '.', 'complaints');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_escalations_notify ON complaint_escalations;
CREATE TRIGGER trg_complaint_escalations_notify
  AFTER INSERT ON complaint_escalations
  FOR EACH ROW EXECUTE FUNCTION complaint_escalations_notify();

-- 4. Improvement feedback ("suggestions"), link to the submitting
-- client (when not anonymous) and notify Service Manager + Director,
-- matching the routing the in-app copy already promises.
ALTER TABLE improvement_feedback
  ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION improvement_feedback_notify() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 'Improvement Feedback' matches ServiceManagerDashboard.jsx's tab id.
  -- Director doesn't have a dedicated tab for this yet (see FIX_LOG), so
  -- no deep-link for that row, the notification itself still fires.
  INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
    ('service_manager', 'feedback', 'New suggestion received',
     COALESCE(NEW.author_name, 'A client') || ' shared a suggestion (' || NEW.category || ').', 'Improvement Feedback'),
    ('director', 'feedback', 'New suggestion received',
     COALESCE(NEW.author_name, 'A client') || ' shared a suggestion (' || NEW.category || ').', NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_improvement_feedback_notify ON improvement_feedback;
CREATE TRIGGER trg_improvement_feedback_notify
  AFTER INSERT ON improvement_feedback
  FOR EACH ROW EXECUTE FUNCTION improvement_feedback_notify();

-- 5. 5-star testimonial auto-publish
-- (a) complaint_satisfaction, the schema's original intent
-- ("survey" testimonial_source + uq_testimonials_source_complaint)
-- (b) feedback, the client-portal "Rate your experience" / review
-- link ratings, which is the flow most clients actually use.
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

  INSERT INTO testimonials (name, rating, comment, branch_id, enabled, source, source_complaint_id)
  VALUES (
    COALESCE(v_name, 'A Ticano client'), NEW.rating,
    COALESCE(NULLIF(TRIM(NEW.comments), ''), 'Excellent, professional service from start to finish.'),
    v_branch_id, TRUE, 'survey', NEW.complaint_id
  )
  ON CONFLICT (source_complaint_id) WHERE source_complaint_id IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_satisfaction_testimonial ON complaint_satisfaction;
CREATE TRIGGER trg_complaint_satisfaction_testimonial
  AFTER INSERT OR UPDATE ON complaint_satisfaction
  FOR EACH ROW EXECUTE FUNCTION complaint_satisfaction_testimonial();

CREATE OR REPLACE FUNCTION feedback_testimonial() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF NEW.rating IS DISTINCT FROM 5 THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_name FROM users WHERE id = NEW.customer_id;

  INSERT INTO testimonials (name, rating, comment, branch_id, enabled, source, source_complaint_id)
  VALUES (
    COALESCE(v_name, 'A Ticano client'), NEW.rating,
    COALESCE(NULLIF(TRIM(NEW.comment), ''), 'Excellent, professional service from start to finish.'),
    NEW.branch_id, TRUE, 'survey', NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_testimonial ON feedback;
CREATE TRIGGER trg_feedback_testimonial
  AFTER INSERT ON feedback
  FOR EACH ROW EXECUTE FUNCTION feedback_testimonial();

-- 6. Realtime, testimonials, feedback, complaint_satisfaction and
-- improvement_feedback (the last was added in migration 010, but
-- re-added here too so this migration is fully self-contained/re-runnable).
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE testimonials; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE feedback; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE complaint_satisfaction; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE improvement_feedback; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE leads; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
