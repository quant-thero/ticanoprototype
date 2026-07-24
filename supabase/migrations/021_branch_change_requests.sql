-- Preferred Branch Change request workflow
-- New feature: a client can request to move their servicing branch.
-- A Service Manager reviews and approves/rejects it; an approval
-- automatically updates the client's branch and notifies them either
-- way. Full history is kept (nothing is ever deleted, only its status
-- changes), so both sides can see past requests.

CREATE TABLE IF NOT EXISTS branch_change_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  requested_branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by TEXT,
  decision_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_branch_change_customer ON branch_change_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_branch_change_status ON branch_change_requests(status);

ALTER TABLE branch_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_change_select" ON branch_change_requests;
CREATE POLICY "branch_change_select" ON branch_change_requests FOR SELECT
  USING (customer_id = current_app_user_id() OR is_staff());

DROP POLICY IF EXISTS "branch_change_insert" ON branch_change_requests;
CREATE POLICY "branch_change_insert" ON branch_change_requests FOR INSERT
  WITH CHECK (customer_id = current_app_user_id());

GRANT SELECT, INSERT ON branch_change_requests TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- One pending request per customer at a time, avoids a backlog of
-- duplicate requests for the same person.
CREATE UNIQUE INDEX IF NOT EXISTS uq_branch_change_one_pending
  ON branch_change_requests(customer_id) WHERE status = 'pending';

-- Notify Service Manager (and Director, for visibility) the moment a
-- client submits a request.
CREATE OR REPLACE FUNCTION branch_change_notify_new() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer_name TEXT;
  v_branch_name TEXT;
BEGIN
  SELECT full_name INTO v_customer_name FROM users WHERE id = NEW.customer_id;
  SELECT name INTO v_branch_name FROM branches WHERE id = NEW.requested_branch_id;

  INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
    ('service_manager', 'branch_change', 'Branch change request',
     COALESCE(v_customer_name, 'A client') || ' has requested to move to ' || COALESCE(v_branch_name, 'a new branch') || '.', 'Branch Changes');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'branch_change_notify_new failed for request %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branch_change_notify_new ON branch_change_requests;
CREATE TRIGGER trg_branch_change_notify_new
  AFTER INSERT ON branch_change_requests
  FOR EACH ROW EXECUTE FUNCTION branch_change_notify_new();

-- Service Manager decision, approving actually moves the client's
-- branch (client_profiles.preferred_branch_id AND users.branch_id, so
-- everything downstream, assignment eligibility, branch-scoped
-- reporting, reflects it immediately), and notifies the client either
-- way with the outcome.
CREATE OR REPLACE FUNCTION decide_branch_change_request(p_request_id BIGINT, p_approve BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer_id BIGINT;
  v_new_branch BIGINT;
  v_branch_name TEXT;
  v_decider_name TEXT;
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Only staff can decide branch change requests';
  END IF;

  SELECT customer_id, requested_branch_id INTO v_customer_id, v_new_branch
  FROM branch_change_requests WHERE id = p_request_id AND status = 'pending';

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Request % not found or already decided', p_request_id;
  END IF;

  SELECT full_name INTO v_decider_name FROM users WHERE auth_user_id = auth.uid();
  SELECT name INTO v_branch_name FROM branches WHERE id = v_new_branch;

  UPDATE branch_change_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      decided_by = COALESCE(v_decider_name, 'Service Manager'),
      decision_note = p_note,
      decided_at = now()
  WHERE id = p_request_id;

  IF p_approve THEN
    UPDATE client_profiles SET preferred_branch_id = v_new_branch WHERE user_id = v_customer_id;
    UPDATE users SET branch_id = v_new_branch WHERE id = v_customer_id;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, link_tab) VALUES (
    v_customer_id, 'branch_change',
    CASE WHEN p_approve THEN 'Branch change approved' ELSE 'Branch change request declined' END,
    CASE WHEN p_approve
      THEN 'Your request to move to ' || COALESCE(v_branch_name, 'your new branch') || ' has been approved.' || COALESCE(' ' || p_note, '')
      ELSE 'Your branch change request was not approved.' || COALESCE(' ' || p_note, '')
    END,
    'profile'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION decide_branch_change_request(BIGINT, BOOLEAN, TEXT) TO authenticated;

-- Realtime, so a Service Manager sees a new request appear live, and a
-- client sees the decision the moment it's made.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE branch_change_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
