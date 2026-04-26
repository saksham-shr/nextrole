-- Change evaluations.score from integer (0-100) to numeric(3,1) (1.0-5.0)
-- to match career-ops scoring scale exactly.

alter table evaluations
  drop constraint if exists evaluations_score_check;

alter table evaluations
  alter column score type numeric(3,1) using score::numeric(3,1);

alter table evaluations
  add constraint evaluations_score_check check (score >= 1.0 and score <= 5.0);
