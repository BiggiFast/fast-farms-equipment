-- ============================================================================
-- READ-ONLY — who opened a survey link, when, and from where. Changes nothing.
-- ----------------------------------------------------------------------------
-- This is what makes a forwarded link visible.
--
-- One person answering on their phone is one or two devices from one or two
-- addresses. That's normal. A link opened from four devices across three
-- addresses is a link that got passed around — and you'd want to know that
-- BEFORE the answers are corrupted, not after.
--
-- `devices` counts distinct address + device pairs. Anything above two is
-- worth a second look, not an accusation — a phone on wifi and then on
-- cellular is genuinely two addresses.
--
-- (This becomes the People tab in the admin.)
-- ============================================================================

select
  p.name,
  count(*)                                                as visits,
  count(distinct (l.ip, l.user_agent))                    as devices,
  count(distinct l.ip)                                    as addresses,
  min(l.occurred_at) at time zone 'America/Los_Angeles'   as first_opened,
  max(l.occurred_at) at time zone 'America/Los_Angeles'   as last_seen,
  case
    when count(distinct (l.ip, l.user_agent)) > 2
      then 'LOOK — more devices than one person usually has'
    else 'normal'
  end                                                     as signal
from public.survey_access_log l
join public.survey_respondents p on p.id = l.respondent_id
group by p.name
order by devices desc, last_seen desc;
