-- backfill existing complaints' PM assignment
-- trg_complaints_auto_assign_pm (migration 015) only fires on INSERT
-- it has no effect on complaints that already existed before that
-- trigger was created, or that were submitted before the customer even
-- had a PM assigned. Those rows are stuck with assigned_pm_id = NULL
-- forever unless backfilled here, which means a real PM could still see
-- "PM still can't see complaints" for perfectly legitimate historical
-- reasons even though everything going forward now works correctly.
--
-- This is safe to re-run, it only ever touches rows that are still
-- unassigned and whose customer now has a PM on file.

UPDATE complaints c
SET assigned_pm_id = cp.assigned_pm_id
FROM client_profiles cp
WHERE c.customer_id = cp.user_id
  AND c.assigned_pm_id IS NULL
  AND cp.assigned_pm_id IS NOT NULL;

-- Same reasoning for feedback.staff_id, a rating given before the
-- client had a PM assigned would otherwise never get attributed, even
-- after they're assigned one later.
UPDATE feedback f
SET staff_id = cp.assigned_pm_id
FROM client_profiles cp
WHERE f.customer_id = cp.user_id
  AND f.staff_id IS NULL
  AND cp.assigned_pm_id IS NOT NULL;
