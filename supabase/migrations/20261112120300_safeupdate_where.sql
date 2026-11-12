-- PostgREST loads pg-safeupdate, which rejects UPDATE and DELETE without a WHERE
-- clause (sqlstate 21000). The trace copy for the silent-update scenario updated
-- every row with no WHERE, so run_lab failed through the Data API and succeeded
-- in a direct SQL session.
--
-- This patches the installed function. 20261112120100_evaluator.sql is already
-- applied on hosted projects, so the fix has to live in a later migration.
-- WHERE true keeps the copy of every ticket and satisfies safeupdate.

do $patch$
declare
  def text;
  old_sql text := 'update lab_sandbox.%I set status = %L';
  new_sql text := 'update lab_sandbox.%I set status = %L where true';
begin
  def := pg_catalog.pg_get_functiondef(
    'lab_internal.evaluate_lab(text,jsonb,text,text,text,jsonb)'::regprocedure
  );
  if position(new_sql in def) = 0 then
    if position(old_sql in def) = 0 then
      raise exception 'evaluate_lab has no trace-table UPDATE to patch';
    end if;
    def := replace(def, old_sql, new_sql);
  end if;
  execute def;
end;
$patch$;
