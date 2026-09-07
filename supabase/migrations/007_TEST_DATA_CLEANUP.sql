-- ============================================================================
-- Removes everything 007_TEST_DATA.sql created. Run when you're done testing.
-- ----------------------------------------------------------------------------
-- Deleting the respondent also deletes their answers and access-log rows
-- (on delete cascade), which is what you want for a test person and is exactly
-- why you would never do this to a real one — prefer Revoke there.
-- ============================================================================

delete from public.survey_respondents where name = 'Test Person';

-- Only the rows the test script tagged. Deliberately NOT a blanket delete:
-- once there are real items in here, a script that clears the table is a
-- script that eventually clears the wrong thing.
delete from public.survey_items where admin_note = 'TEST DATA';


-- Confirm the slate is clean. Both counts should be 0.
select
  (select count(*) from public.survey_respondents) as respondents_left,
  (select count(*) from public.survey_items)       as items_left,
  (select count(*) from public.survey_responses)   as answers_left;
