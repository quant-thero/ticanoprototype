-- Service Manager WhatsApp templates: customer-facing
-- only, not staff-to-staff
-- Service Manager's WhatsApp composer (WhatsAppSimulator.jsx) filters
-- templates strictly by the logged-in user's role, so a Service
-- Manager only ever sees 'service_manager'-role templates there. Of
-- the original five, only one ("Escalation Notice to Client") was
-- actually addressed to a customer; the other four were staff-to-staff
-- messages (branch updates, SLA warnings to a PM, performance alerts)
-- that belong in the internal staff messaging system now, not a
-- customer-facing WhatsApp tool.
--
-- This removes those four and adds customer-facing templates covering
-- the situations a Service Manager actually messages a *client* about:
-- acknowledging an escalation, confirming it's resolved, and following
-- up on one that's taking longer than expected.

DELETE FROM wa_templates
WHERE role = 'service_manager'
  AND template_key IN ('branch_update', 'sla_warning', 'staff_alert', 'sla_breach');

-- Refine the existing escalation-acknowledgment template's wording
-- slightly (was already customer-facing and stays as-is otherwise).
UPDATE wa_templates
SET body = 'Dear [Name], I am [Manager], Service Manager for [Branch]. Your complaint [Ticket] has been escalated to me for priority attention, and I sincerely apologise for the delay. I will personally ensure this is resolved within 2 business days.',
    variables = ARRAY['Name','Ticket','Manager','Branch'],
    name = 'Escalation Acknowledgment'
WHERE role = 'service_manager' AND template_key = 'escalation_client';

INSERT INTO wa_templates (role, name, template_key, body, variables, is_active) VALUES
  ('service_manager', 'Escalation Resolved', 'sm_escalation_resolved',
   'Dear [Name], I am pleased to let you know that your escalated complaint [Ticket] has now been resolved. Thank you for your patience, please do not hesitate to reach out if there is anything further I can help with. [Manager], Service Manager, Ticano [Branch]',
   ARRAY['Name','Ticket','Manager','Branch'], true),
  ('service_manager', 'Escalation Follow-up', 'sm_escalation_followup',
   'Dear [Name], I wanted to personally follow up on your complaint [Ticket]. I understand this has taken longer than expected and I sincerely apologise. Update: [Update]. I remain personally available if you have any questions. [Manager], Service Manager',
   ARRAY['Name','Ticket','Update','Manager'], true),
  ('service_manager', 'Service Recovery', 'sm_service_recovery',
   'Dear [Name], on behalf of Ticano Group I want to sincerely apologise for the experience you have had with [Ticket]. This does not reflect the standard we hold ourselves to, and I am personally overseeing your case going forward. [Manager], Service Manager, Ticano [Branch]',
   ARRAY['Name','Ticket','Manager','Branch'], true)
ON CONFLICT (role, template_key) DO NOTHING;
