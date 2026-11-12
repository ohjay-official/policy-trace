-- Safe lab evaluator.
-- User SQL is tokenized and re-emitted. The original text is never executed.
-- Sandbox DDL runs in a subtransaction that always rolls back.

create or replace function lab_internal.fail(detail text, pos integer)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'ok', false,
    'error', 'rejected',
    'detail', detail,
    'position', pos
  );
$$;

create or replace function lab_internal.ok(idx integer, sql text)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select jsonb_build_object('ok', true, 'idx', idx, 'sql', sql);
$$;

create or replace function lab_internal.qid(name text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when name ~ '^[a-z_][a-z0-9_]*$' and name not in (
      'select', 'insert', 'update', 'delete', 'all', 'user', 'table', 'grant',
      'revoke', 'create', 'drop', 'alter', 'policy', 'true', 'false', 'null',
      'and', 'or', 'not', 'exists', 'where', 'from', 'as', 'on', 'to', 'check',
      'using', 'for', 'enable', 'disable', 'row', 'level', 'security', 'if',
      'with', 'privileges', 'restrictive', 'permissive', 'in', 'is'
    )
    then name
    else '"' || replace(name, '"', '""') || '"'
  end;
$$;

create or replace function lab_internal.tok(tokens jsonb, idx integer)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when idx >= 0 and idx < jsonb_array_length(tokens) then tokens -> idx
    else null
  end;
$$;

create or replace function lab_internal.pos(tokens jsonb, idx integer)
returns integer
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    (lab_internal.tok(tokens, idx) ->> 'p')::integer,
    (tokens -> (jsonb_array_length(tokens) - 1) ->> 'p')::integer,
    1
  );
$$;

create or replace function lab_internal.word_is(tok jsonb, expected text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select tok is not null and tok ->> 't' = 'word' and lower(tok ->> 'v') = expected;
$$;

create or replace function lab_internal.op_is(tok jsonb, expected text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select tok is not null and tok ->> 't' = 'op' and tok ->> 'v' = expected;
$$;

create or replace function lab_internal.tokenize(p_sql text)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  n integer := char_length(coalesce(p_sql, ''));
  i integer := 1;
  c text;
  start_pos integer;
  buf text;
  tokens jsonb := '[]'::jsonb;
  closed boolean;
begin
  if p_sql is null then
    return jsonb_build_object('ok', true, 'tokens', '[]'::jsonb);
  end if;

  while i <= n loop
    c := substr(p_sql, i, 1);
    if c ~ '\s' then
      i := i + 1;
    elsif c = '-' and substr(p_sql, i, 2) = '--' then
      i := i + 2;
      while i <= n and substr(p_sql, i, 1) <> E'\n' loop
        i := i + 1;
      end loop;
    elsif c = '/' and substr(p_sql, i, 2) = '/*' then
      start_pos := i;
      i := i + 2;
      while i <= n and substr(p_sql, i, 2) <> '*/' loop
        i := i + 1;
      end loop;
      if i > n then
        return lab_internal.fail('Unclosed block comment.', start_pos);
      end if;
      i := i + 2;
    elsif c = '$' then
      return lab_internal.fail('Dollar quoting is not allowed.', i);
    elsif c = '''' then
      start_pos := i;
      i := i + 1;
      buf := '';
      closed := false;
      while i <= n loop
        if substr(p_sql, i, 1) = '''' then
          if substr(p_sql, i, 2) = '''''' then
            buf := buf || '''';
            i := i + 2;
          else
            i := i + 1;
            closed := true;
            exit;
          end if;
        else
          buf := buf || substr(p_sql, i, 1);
          i := i + 1;
        end if;
      end loop;
      if not closed then
        return lab_internal.fail('Unclosed string.', start_pos);
      end if;
      tokens := tokens || jsonb_build_array(jsonb_build_object('t', 'string', 'v', buf, 'p', start_pos));
    elsif c = '"' then
      start_pos := i;
      i := i + 1;
      buf := '';
      closed := false;
      while i <= n loop
        if substr(p_sql, i, 1) = '"' then
          if substr(p_sql, i, 2) = '""' then
            buf := buf || '"';
            i := i + 2;
          else
            i := i + 1;
            closed := true;
            exit;
          end if;
        else
          if substr(p_sql, i, 1) = ';' then
            return lab_internal.fail('This character is not allowed in an identifier.', i);
          end if;
          buf := buf || substr(p_sql, i, 1);
          i := i + 1;
        end if;
      end loop;
      if not closed then
        return lab_internal.fail('Unclosed quoted identifier.', start_pos);
      end if;
      if char_length(buf) = 0 or char_length(buf) > 63 then
        return lab_internal.fail('Identifier length must be between 1 and 63.', start_pos);
      end if;
      tokens := tokens || jsonb_build_array(jsonb_build_object('t', 'ident', 'v', buf, 'p', start_pos));
    elsif c ~ '[A-Za-z_]' then
      start_pos := i;
      buf := '';
      while i <= n and substr(p_sql, i, 1) ~ '[A-Za-z0-9_]' loop
        buf := buf || substr(p_sql, i, 1);
        i := i + 1;
      end loop;
      tokens := tokens || jsonb_build_array(jsonb_build_object('t', 'word', 'v', buf, 'p', start_pos));
    elsif c ~ '[0-9]' then
      start_pos := i;
      buf := '';
      while i <= n and substr(p_sql, i, 1) ~ '[0-9]' loop
        buf := buf || substr(p_sql, i, 1);
        i := i + 1;
      end loop;
      tokens := tokens || jsonb_build_array(jsonb_build_object('t', 'number', 'v', buf, 'p', start_pos));
    elsif substr(p_sql, i, 3) = '->>' then
      tokens := tokens || jsonb_build_array(jsonb_build_object('t', 'op', 'v', '->>', 'p', i));
      i := i + 3;
    elsif substr(p_sql, i, 2) in ('->', '::', '<>', '!=', '<=', '>=') then
      tokens := tokens || jsonb_build_array(jsonb_build_object('t', 'op', 'v', substr(p_sql, i, 2), 'p', i));
      i := i + 2;
    elsif c in ('(', ')', ',', '.', '=', '<', '>', ';') then
      tokens := tokens || jsonb_build_array(jsonb_build_object('t', 'op', 'v', c, 'p', i));
      i := i + 1;
    else
      return lab_internal.fail(format('Unexpected character "%s".', c), i);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'tokens', tokens);
end;
$fn$;

create or replace function lab_internal.parse_expr(tokens jsonb, idx integer, depth integer, tables text[])
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  left_part jsonb;
  right_part jsonb;
  sql text;
  tok jsonb;
  subquery jsonb;
  item text;
  alias text;
  table_name text;
  where_sql text;
  fn text;
  call_sql text;
  arrow text;
  key text;
  cast_type text;
  items text;
  lit text;
  first text;
  second text;
  negate boolean;
  op text;
begin
  if depth > 12 then
    return lab_internal.fail('Expression is too deeply nested.', lab_internal.pos(tokens, idx));
  end if;

  -- OR
  left_part := lab_internal.parse_and(tokens, idx, depth + 1, tables);
  if not coalesce((left_part ->> 'ok')::boolean, false) then
    return left_part;
  end if;
  idx := (left_part ->> 'idx')::integer;
  sql := left_part ->> 'sql';
  while lab_internal.word_is(lab_internal.tok(tokens, idx), 'or') loop
    idx := idx + 1;
    right_part := lab_internal.parse_and(tokens, idx, depth + 1, tables);
    if not coalesce((right_part ->> 'ok')::boolean, false) then
      return right_part;
    end if;
    idx := (right_part ->> 'idx')::integer;
    sql := '(' || sql || ' or ' || (right_part ->> 'sql') || ')';
  end loop;
  return lab_internal.ok(idx, sql);
end;
$fn$;
create or replace function lab_internal.is_keyword(name text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select lower(name) in (
    'select', 'insert', 'update', 'delete', 'all', 'user', 'table', 'grant',
    'revoke', 'create', 'drop', 'alter', 'policy', 'true', 'false', 'null',
    'and', 'or', 'not', 'exists', 'where', 'from', 'as', 'on', 'to', 'check',
    'using', 'for', 'enable', 'disable', 'row', 'level', 'security', 'if',
    'with', 'privileges', 'restrictive', 'permissive', 'in', 'is'
  );
$$;

create or replace function lab_internal.apply_cast(tokens jsonb, idx integer, sql text)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  cast_type text;
  inner_sql text;
begin
  if not lab_internal.op_is(lab_internal.tok(tokens, idx), '::') then
    return lab_internal.ok(idx, sql);
  end if;
  idx := idx + 1;
  if coalesce(lab_internal.tok(tokens, idx) ->> 't', '') <> 'word' then
    return lab_internal.fail('Casts are limited to uuid, text, and boolean.', lab_internal.pos(tokens, idx));
  end if;
  cast_type := lower(lab_internal.tok(tokens, idx) ->> 'v');
  if cast_type not in ('uuid', 'text', 'boolean') then
    return lab_internal.fail('Casts are limited to uuid, text, and boolean.', lab_internal.pos(tokens, idx));
  end if;
  if left(sql, 1) = '(' then
    inner_sql := sql;
  else
    inner_sql := '(' || sql || ')';
  end if;
  return lab_internal.ok(idx + 1, inner_sql || '::' || cast_type);
end;
$fn$;

create or replace function lab_internal.parse_auth(tokens jsonb, idx integer)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  fn text;
  sql text;
  arrow text;
begin
  if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'auth') then
    return lab_internal.fail('Function calls are limited to auth.uid() and auth.jwt().', lab_internal.pos(tokens, idx));
  end if;
  idx := idx + 1;
  if not lab_internal.op_is(lab_internal.tok(tokens, idx), '.') then
    return lab_internal.fail('Expected ".".', lab_internal.pos(tokens, idx));
  end if;
  idx := idx + 1;
  if coalesce(lab_internal.tok(tokens, idx) ->> 't', '') <> 'word' then
    return lab_internal.fail('Function calls are limited to auth.uid() and auth.jwt().', lab_internal.pos(tokens, idx));
  end if;
  fn := lower(lab_internal.tok(tokens, idx) ->> 'v');
  if fn not in ('uid', 'jwt') then
    return lab_internal.fail('Function calls are limited to auth.uid() and auth.jwt().', lab_internal.pos(tokens, idx));
  end if;
  idx := idx + 1;
  if not lab_internal.op_is(lab_internal.tok(tokens, idx), '(') then
    return lab_internal.fail('Expected "(".', lab_internal.pos(tokens, idx));
  end if;
  idx := idx + 1;
  if not lab_internal.op_is(lab_internal.tok(tokens, idx), ')') then
    return lab_internal.fail('Expected ")".', lab_internal.pos(tokens, idx));
  end if;
  idx := idx + 1;
  sql := 'auth.' || fn || '()';
  if lab_internal.op_is(lab_internal.tok(tokens, idx), '->>')
     or lab_internal.op_is(lab_internal.tok(tokens, idx), '->') then
    if fn <> 'jwt' then
      return lab_internal.fail('Only auth.jwt() can use -> or ->>.', lab_internal.pos(tokens, idx));
    end if;
    arrow := lab_internal.tok(tokens, idx) ->> 'v';
    idx := idx + 1;
    if coalesce(lab_internal.tok(tokens, idx) ->> 't', '') <> 'string' then
      return lab_internal.fail('Expected a claim name string.', lab_internal.pos(tokens, idx));
    end if;
    sql := sql || ' ' || arrow || ' ' || quote_literal(lab_internal.tok(tokens, idx) ->> 'v');
    idx := idx + 1;
  end if;
  return lab_internal.ok(idx, sql);
end;
$fn$;

create or replace function lab_internal.parse_table(tokens jsonb, idx integer, tables text[])
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  tok jsonb;
  name text;
begin
  if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'lab_sandbox') then
    return lab_internal.fail('Table must be schema-qualified as lab_sandbox.<table>.', lab_internal.pos(tokens, idx));
  end if;
  idx := idx + 1;
  if not lab_internal.op_is(lab_internal.tok(tokens, idx), '.') then
    return lab_internal.fail('Expected ".".', lab_internal.pos(tokens, idx));
  end if;
  idx := idx + 1;
  tok := lab_internal.tok(tokens, idx);
  if tok is null or (tok ->> 't' <> 'word' and tok ->> 't' <> 'ident') then
    return lab_internal.fail('Expected a table name.', lab_internal.pos(tokens, idx));
  end if;
  name := lower(tok ->> 'v');
  if name !~ '^[a-z_][a-z0-9_]*$' or not (name = any(tables)) then
    return lab_internal.fail('Table is not part of this scenario.', (tok ->> 'p')::integer);
  end if;
  return lab_internal.ok(idx + 1, name);
end;
$fn$;

create or replace function lab_internal.parse_column(tokens jsonb, idx integer)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  tok jsonb;
  first text;
  second text;
begin
  tok := lab_internal.tok(tokens, idx);
  if tok is null or (tok ->> 't' <> 'word' and tok ->> 't' <> 'ident') then
    return lab_internal.fail('Expected a column name.', lab_internal.pos(tokens, idx));
  end if;
  if tok ->> 't' = 'word' and lower(tok ->> 'v') = 'auth' then
    return lab_internal.fail('Expected a column name.', (tok ->> 'p')::integer);
  end if;
  if tok ->> 't' = 'word' then
    first := lower(tok ->> 'v');
  else
    first := tok ->> 'v';
  end if;
  if first !~ '^[a-z_][a-z0-9_]*$' then
    return lab_internal.fail('Column names must be simple identifiers.', (tok ->> 'p')::integer);
  end if;
  idx := idx + 1;
  if lab_internal.op_is(lab_internal.tok(tokens, idx), '.') then
    idx := idx + 1;
    tok := lab_internal.tok(tokens, idx);
    if tok is null or (tok ->> 't' <> 'word' and tok ->> 't' <> 'ident') then
      return lab_internal.fail('Expected a column name.', lab_internal.pos(tokens, idx));
    end if;
    if tok ->> 't' = 'word' then
      second := lower(tok ->> 'v');
    else
      second := tok ->> 'v';
    end if;
    if second !~ '^[a-z_][a-z0-9_]*$' then
      return lab_internal.fail('Column names must be simple identifiers.', (tok ->> 'p')::integer);
    end if;
    idx := idx + 1;
    if lab_internal.op_is(lab_internal.tok(tokens, idx), '(') then
      return lab_internal.fail('Function calls are limited to auth.uid() and auth.jwt().', lab_internal.pos(tokens, idx));
    end if;
    return lab_internal.ok(idx, first || '.' || second);
  end if;
  if lab_internal.op_is(lab_internal.tok(tokens, idx), '(') then
    return lab_internal.fail('Function calls are limited to auth.uid() and auth.jwt().', lab_internal.pos(tokens, idx));
  end if;
  return lab_internal.ok(idx, first);
end;
$fn$;

create or replace function lab_internal.parse_subquery(tokens jsonb, idx integer, depth integer, tables text[])
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  item jsonb;
  table_part jsonb;
  alias text := '';
  where_part jsonb;
  where_sql text := '';
  tok jsonb;
begin
  if depth > 12 then
    return lab_internal.fail('Expression is too deeply nested.', lab_internal.pos(tokens, idx));
  end if;
  if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'select') then
    return lab_internal.fail('Expected SELECT.', lab_internal.pos(tokens, idx));
  end if;
  idx := idx + 1;
  tok := lab_internal.tok(tokens, idx);
  if tok is not null and tok ->> 't' = 'number' then
    item := lab_internal.ok(idx + 1, tok ->> 'v');
  else
    item := lab_internal.parse_column(tokens, idx);
  end if;
  if not coalesce((item ->> 'ok')::boolean, false) then
    return item;
  end if;
  idx := (item ->> 'idx')::integer;
  if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'from') then
    return lab_internal.fail('Expected FROM.', lab_internal.pos(tokens, idx));
  end if;
  idx := idx + 1;
  table_part := lab_internal.parse_table(tokens, idx, tables);
  if not coalesce((table_part ->> 'ok')::boolean, false) then
    return table_part;
  end if;
  idx := (table_part ->> 'idx')::integer;
  if lab_internal.word_is(lab_internal.tok(tokens, idx), 'as') then
    idx := idx + 1;
    tok := lab_internal.tok(tokens, idx);
    if tok is null or tok ->> 't' <> 'word' then
      return lab_internal.fail('Expected a table alias.', lab_internal.pos(tokens, idx));
    end if;
    alias := lower(tok ->> 'v');
    if lab_internal.is_keyword(alias) or alias !~ '^[a-z_][a-z0-9_]*$' then
      return lab_internal.fail('That alias is not allowed.', (tok ->> 'p')::integer);
    end if;
    idx := idx + 1;
    alias := ' ' || alias;
  elsif lab_internal.tok(tokens, idx) ->> 't' = 'word'
        and not lab_internal.word_is(lab_internal.tok(tokens, idx), 'where') then
    tok := lab_internal.tok(tokens, idx);
    alias := lower(tok ->> 'v');
    if lab_internal.is_keyword(alias) or alias !~ '^[a-z_][a-z0-9_]*$' then
      return lab_internal.fail('That alias is not allowed.', (tok ->> 'p')::integer);
    end if;
    idx := idx + 1;
    alias := ' ' || alias;
  end if;
  if lab_internal.word_is(lab_internal.tok(tokens, idx), 'where') then
    idx := idx + 1;
    where_part := lab_internal.parse_expr(tokens, idx, depth + 1, tables);
    if not coalesce((where_part ->> 'ok')::boolean, false) then
      return where_part;
    end if;
    idx := (where_part ->> 'idx')::integer;
    where_sql := ' where ' || (where_part ->> 'sql');
  end if;
  return lab_internal.ok(
    idx,
    'select ' || (item ->> 'sql') || ' from lab_sandbox.' || (table_part ->> 'sql') || alias || where_sql
  );
end;
$fn$;

create or replace function lab_internal.parse_value(tokens jsonb, idx integer, depth integer, tables text[])
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  tok jsonb;
  next_tok jsonb;
  auth_part jsonb;
  inner_part jsonb;
  column_part jsonb;
begin
  if depth > 12 then
    return lab_internal.fail('Expression is too deeply nested.', lab_internal.pos(tokens, idx));
  end if;
  tok := lab_internal.tok(tokens, idx);
  if tok is null then
    return lab_internal.fail('Expected an expression.', lab_internal.pos(tokens, idx));
  end if;

  if lab_internal.op_is(tok, '(') then
    next_tok := lab_internal.tok(tokens, idx + 1);
    if next_tok is not null and next_tok ->> 't' = 'word' and lower(next_tok ->> 'v') = 'select' then
      auth_part := lab_internal.parse_auth(tokens, idx + 2);
      if not coalesce((auth_part ->> 'ok')::boolean, false) then
        return auth_part;
      end if;
      idx := (auth_part ->> 'idx')::integer;
      if not lab_internal.op_is(lab_internal.tok(tokens, idx), ')') then
        return lab_internal.fail('Expected ")".', lab_internal.pos(tokens, idx));
      end if;
      idx := idx + 1;
      if lab_internal.word_is(lab_internal.tok(tokens, idx), 'from') then
        return lab_internal.fail('A scalar subquery may only call auth.uid() or auth.jwt().', lab_internal.pos(tokens, idx));
      end if;
      return lab_internal.apply_cast(tokens, idx, '(select ' || (auth_part ->> 'sql') || ')');
    end if;
    inner_part := lab_internal.parse_expr(tokens, idx + 1, depth + 1, tables);
    if not coalesce((inner_part ->> 'ok')::boolean, false) then
      return inner_part;
    end if;
    idx := (inner_part ->> 'idx')::integer;
    if not lab_internal.op_is(lab_internal.tok(tokens, idx), ')') then
      return lab_internal.fail('Expected ")".', lab_internal.pos(tokens, idx));
    end if;
    return lab_internal.apply_cast(tokens, idx + 1, inner_part ->> 'sql');
  end if;

  if tok ->> 't' = 'word' and lower(tok ->> 'v') = 'auth' then
    auth_part := lab_internal.parse_auth(tokens, idx);
    if not coalesce((auth_part ->> 'ok')::boolean, false) then
      return auth_part;
    end if;
    return lab_internal.apply_cast(tokens, (auth_part ->> 'idx')::integer, auth_part ->> 'sql');
  end if;

  if tok ->> 't' = 'word' and lower(tok ->> 'v') in ('true', 'false', 'null') then
    return lab_internal.apply_cast(tokens, idx + 1, lower(tok ->> 'v'));
  end if;

  if tok ->> 't' = 'string' then
    return lab_internal.apply_cast(tokens, idx + 1, quote_literal(tok ->> 'v'));
  end if;

  if tok ->> 't' = 'number' then
    return lab_internal.apply_cast(tokens, idx + 1, tok ->> 'v');
  end if;

  if tok ->> 't' in ('word', 'ident') then
    column_part := lab_internal.parse_column(tokens, idx);
    if not coalesce((column_part ->> 'ok')::boolean, false) then
      return column_part;
    end if;
    return lab_internal.apply_cast(tokens, (column_part ->> 'idx')::integer, column_part ->> 'sql');
  end if;

  return lab_internal.fail('Function calls are limited to auth.uid() and auth.jwt().', (tok ->> 'p')::integer);
end;
$fn$;

create or replace function lab_internal.parse_pred(tokens jsonb, idx integer, depth integer, tables text[])
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  left_part jsonb;
  right_part jsonb;
  sub_part jsonb;
  sql text;
  op text;
  negate boolean;
  items text := '';
  tok jsonb;
  lit text;
begin
  if depth > 12 then
    return lab_internal.fail('Expression is too deeply nested.', lab_internal.pos(tokens, idx));
  end if;

  if lab_internal.word_is(lab_internal.tok(tokens, idx), 'exists') then
    idx := idx + 1;
    if not lab_internal.op_is(lab_internal.tok(tokens, idx), '(') then
      return lab_internal.fail('Expected "(".', lab_internal.pos(tokens, idx));
    end if;
    sub_part := lab_internal.parse_subquery(tokens, idx + 1, depth + 1, tables);
    if not coalesce((sub_part ->> 'ok')::boolean, false) then
      return sub_part;
    end if;
    idx := (sub_part ->> 'idx')::integer;
    if not lab_internal.op_is(lab_internal.tok(tokens, idx), ')') then
      return lab_internal.fail('Expected ")".', lab_internal.pos(tokens, idx));
    end if;
    return lab_internal.ok(idx + 1, '(exists (' || (sub_part ->> 'sql') || '))');
  end if;

  left_part := lab_internal.parse_value(tokens, idx, depth, tables);
  if not coalesce((left_part ->> 'ok')::boolean, false) then
    return left_part;
  end if;
  idx := (left_part ->> 'idx')::integer;
  sql := left_part ->> 'sql';
  tok := lab_internal.tok(tokens, idx);

  if tok is not null and tok ->> 't' = 'op' and tok ->> 'v' in ('=', '<>', '!=', '<', '>', '<=', '>=') then
    op := case when tok ->> 'v' = '!=' then '<>' else tok ->> 'v' end;
    right_part := lab_internal.parse_value(tokens, idx + 1, depth, tables);
    if not coalesce((right_part ->> 'ok')::boolean, false) then
      return right_part;
    end if;
    return lab_internal.ok((right_part ->> 'idx')::integer, '(' || sql || ' ' || op || ' ' || (right_part ->> 'sql') || ')');
  end if;

  if lab_internal.word_is(tok, 'is') then
    idx := idx + 1;
    negate := lab_internal.word_is(lab_internal.tok(tokens, idx), 'not');
    if negate then
      idx := idx + 1;
    end if;
    if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'null') then
      return lab_internal.fail('Expected NULL.', lab_internal.pos(tokens, idx));
    end if;
    if negate then
      return lab_internal.ok(idx + 1, '(' || sql || ' is not null)');
    end if;
    return lab_internal.ok(idx + 1, '(' || sql || ' is null)');
  end if;

  if lab_internal.word_is(tok, 'in') then
    idx := idx + 1;
    if not lab_internal.op_is(lab_internal.tok(tokens, idx), '(') then
      return lab_internal.fail('Expected "(".', lab_internal.pos(tokens, idx));
    end if;
    idx := idx + 1;
    if lab_internal.word_is(lab_internal.tok(tokens, idx), 'select') then
      sub_part := lab_internal.parse_subquery(tokens, idx, depth + 1, tables);
      if not coalesce((sub_part ->> 'ok')::boolean, false) then
        return sub_part;
      end if;
      idx := (sub_part ->> 'idx')::integer;
      if not lab_internal.op_is(lab_internal.tok(tokens, idx), ')') then
        return lab_internal.fail('Expected ")".', lab_internal.pos(tokens, idx));
      end if;
      return lab_internal.ok(idx + 1, '(' || sql || ' in (' || (sub_part ->> 'sql') || '))');
    end if;
    loop
      tok := lab_internal.tok(tokens, idx);
      if tok is null then
        return lab_internal.fail('Expected a literal.', lab_internal.pos(tokens, idx));
      end if;
      if tok ->> 't' = 'string' then
        lit := quote_literal(tok ->> 'v');
      elsif tok ->> 't' = 'number' then
        lit := tok ->> 'v';
      elsif tok ->> 't' = 'word' and lower(tok ->> 'v') in ('true', 'false', 'null') then
        lit := lower(tok ->> 'v');
      else
        return lab_internal.fail(
          'IN lists only allow literals. Query a lab_sandbox table with IN (SELECT ...).',
          (tok ->> 'p')::integer
        );
      end if;
      idx := idx + 1;
      if items = '' then
        items := lit;
      else
        items := items || ', ' || lit;
      end if;
      exit when not lab_internal.op_is(lab_internal.tok(tokens, idx), ',');
      idx := idx + 1;
    end loop;
    if not lab_internal.op_is(lab_internal.tok(tokens, idx), ')') then
      return lab_internal.fail('Expected ")".', lab_internal.pos(tokens, idx));
    end if;
    return lab_internal.ok(idx + 1, '(' || sql || ' in (' || items || '))');
  end if;

  return lab_internal.ok(idx, sql);
end;
$fn$;

create or replace function lab_internal.parse_not(tokens jsonb, idx integer, depth integer, tables text[])
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  inner_part jsonb;
begin
  if depth > 12 then
    return lab_internal.fail('Expression is too deeply nested.', lab_internal.pos(tokens, idx));
  end if;
  if lab_internal.word_is(lab_internal.tok(tokens, idx), 'not') then
    inner_part := lab_internal.parse_not(tokens, idx + 1, depth + 1, tables);
    if not coalesce((inner_part ->> 'ok')::boolean, false) then
      return inner_part;
    end if;
    return lab_internal.ok((inner_part ->> 'idx')::integer, '(not ' || (inner_part ->> 'sql') || ')');
  end if;
  return lab_internal.parse_pred(tokens, idx, depth, tables);
end;
$fn$;

create or replace function lab_internal.parse_and(tokens jsonb, idx integer, depth integer, tables text[])
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  left_part jsonb;
  right_part jsonb;
  sql text;
begin
  if depth > 12 then
    return lab_internal.fail('Expression is too deeply nested.', lab_internal.pos(tokens, idx));
  end if;
  left_part := lab_internal.parse_not(tokens, idx, depth + 1, tables);
  if not coalesce((left_part ->> 'ok')::boolean, false) then
    return left_part;
  end if;
  idx := (left_part ->> 'idx')::integer;
  sql := left_part ->> 'sql';
  while lab_internal.word_is(lab_internal.tok(tokens, idx), 'and') loop
    idx := idx + 1;
    right_part := lab_internal.parse_not(tokens, idx, depth + 1, tables);
    if not coalesce((right_part ->> 'ok')::boolean, false) then
      return right_part;
    end if;
    idx := (right_part ->> 'idx')::integer;
    sql := '(' || sql || ' and ' || (right_part ->> 'sql') || ')';
  end loop;
  return lab_internal.ok(idx, sql);
end;
$fn$;
create or replace function lab_internal.parse_statement(tokens jsonb, idx integer, tables text[])
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  tok jsonb;
  head text;
  name text;
  table_part jsonb;
  table_name text;
  permissive boolean;
  command text;
  roles jsonb;
  role_name text;
  privs text[] := array[]::text[];
  priv text;
  using_sql text;
  check_sql text;
  expr jsonb;
  if_exists boolean := false;
  sql text;
  action jsonb;
  enable_rls boolean;
begin
  tok := lab_internal.tok(tokens, idx);
  if tok is null or tok ->> 't' <> 'word' then
    return lab_internal.fail(
      'Only CREATE POLICY, DROP POLICY, ALTER TABLE ... ROW LEVEL SECURITY, GRANT, and REVOKE are allowed.',
      lab_internal.pos(tokens, idx)
    );
  end if;
  head := lower(tok ->> 'v');

  if head = 'create' then
    idx := idx + 1;
    if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'policy') then
      return lab_internal.fail(
        'Only CREATE POLICY, DROP POLICY, ALTER TABLE ... ROW LEVEL SECURITY, GRANT, and REVOKE are allowed.',
        lab_internal.pos(tokens, idx)
      );
    end if;
    idx := idx + 1;
    tok := lab_internal.tok(tokens, idx);
    if tok is null or (tok ->> 't' <> 'word' and tok ->> 't' <> 'ident') then
      return lab_internal.fail('Expected a policy name.', lab_internal.pos(tokens, idx));
    end if;
    if char_length(tok ->> 'v') > 63 then
      return lab_internal.fail('Identifier length must be between 1 and 63.', (tok ->> 'p')::integer);
    end if;
    name := case when tok ->> 't' = 'word' then lower(tok ->> 'v') else tok ->> 'v' end;
    idx := idx + 1;
    if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'on') then
      return lab_internal.fail('Expected ON.', lab_internal.pos(tokens, idx));
    end if;
    table_part := lab_internal.parse_table(tokens, idx + 1, tables);
    if not coalesce((table_part ->> 'ok')::boolean, false) then
      return table_part;
    end if;
    idx := (table_part ->> 'idx')::integer;
    table_name := table_part ->> 'sql';
    permissive := true;
    if lab_internal.word_is(lab_internal.tok(tokens, idx), 'as') then
      idx := idx + 1;
      if lab_internal.word_is(lab_internal.tok(tokens, idx), 'permissive') then
        permissive := true;
        idx := idx + 1;
      elsif lab_internal.word_is(lab_internal.tok(tokens, idx), 'restrictive') then
        permissive := false;
        idx := idx + 1;
      else
        return lab_internal.fail('Expected PERMISSIVE or RESTRICTIVE.', lab_internal.pos(tokens, idx));
      end if;
    end if;
    command := 'all';
    if lab_internal.word_is(lab_internal.tok(tokens, idx), 'for') then
      idx := idx + 1;
      if coalesce(lab_internal.tok(tokens, idx) ->> 't', '') <> 'word'
         or lower(lab_internal.tok(tokens, idx) ->> 'v') not in ('all', 'select', 'insert', 'update', 'delete') then
        return lab_internal.fail('Expected a command.', lab_internal.pos(tokens, idx));
      end if;
      command := lower(lab_internal.tok(tokens, idx) ->> 'v');
      idx := idx + 1;
    end if;
    roles := jsonb_build_array('public');
    if lab_internal.word_is(lab_internal.tok(tokens, idx), 'to') then
      idx := idx + 1;
      roles := '[]'::jsonb;
      loop
        tok := lab_internal.tok(tokens, idx);
        if tok is null or (tok ->> 't' <> 'word' and tok ->> 't' <> 'ident') then
          return lab_internal.fail('Expected a role.', lab_internal.pos(tokens, idx));
        end if;
        role_name := lower(tok ->> 'v');
        if role_name not in ('anon', 'authenticated', 'service_role', 'public') then
          return lab_internal.fail(
            'Role must be anon, authenticated, service_role, or public.',
            (tok ->> 'p')::integer
          );
        end if;
        roles := roles || jsonb_build_array(role_name);
        idx := idx + 1;
        exit when not lab_internal.op_is(lab_internal.tok(tokens, idx), ',');
        idx := idx + 1;
      end loop;
    end if;
    using_sql := null;
    check_sql := null;
    if lab_internal.word_is(lab_internal.tok(tokens, idx), 'using') then
      idx := idx + 1;
      if not lab_internal.op_is(lab_internal.tok(tokens, idx), '(') then
        return lab_internal.fail('Expected "(".', lab_internal.pos(tokens, idx));
      end if;
      expr := lab_internal.parse_expr(tokens, idx + 1, 0, tables);
      if not coalesce((expr ->> 'ok')::boolean, false) then
        return expr;
      end if;
      idx := (expr ->> 'idx')::integer;
      if not lab_internal.op_is(lab_internal.tok(tokens, idx), ')') then
        return lab_internal.fail('Expected ")".', lab_internal.pos(tokens, idx));
      end if;
      idx := idx + 1;
      using_sql := expr ->> 'sql';
    end if;
    if lab_internal.word_is(lab_internal.tok(tokens, idx), 'with') then
      idx := idx + 1;
      if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'check') then
        return lab_internal.fail('Expected CHECK.', lab_internal.pos(tokens, idx));
      end if;
      idx := idx + 1;
      if not lab_internal.op_is(lab_internal.tok(tokens, idx), '(') then
        return lab_internal.fail('Expected "(".', lab_internal.pos(tokens, idx));
      end if;
      expr := lab_internal.parse_expr(tokens, idx + 1, 0, tables);
      if not coalesce((expr ->> 'ok')::boolean, false) then
        return expr;
      end if;
      idx := (expr ->> 'idx')::integer;
      if not lab_internal.op_is(lab_internal.tok(tokens, idx), ')') then
        return lab_internal.fail('Expected ")".', lab_internal.pos(tokens, idx));
      end if;
      idx := idx + 1;
      check_sql := expr ->> 'sql';
    end if;
    if using_sql is null and check_sql is null then
      return lab_internal.fail('A policy needs USING, WITH CHECK, or both.', lab_internal.pos(tokens, idx));
    end if;
    sql := 'create policy ' || lab_internal.qid(name)
      || ' on lab_sandbox.' || table_name
      || ' as ' || case when permissive then 'permissive' else 'restrictive' end
      || ' for ' || command
      || ' to ' || (
        select string_agg(value, ', ' order by ord)
        from jsonb_array_elements_text(roles) with ordinality as role_list(value, ord)
      )
      || case when using_sql is not null then ' using (' || using_sql || ')' else '' end
      || case when check_sql is not null then ' with check (' || check_sql || ')' else '' end;
    action := jsonb_build_object(
      'op', 'create_policy',
      'table', table_name,
      'name', name,
      'command', command,
      'permissive', permissive,
      'roles', roles,
      'usingExpr', using_sql,
      'withCheckExpr', check_sql,
      'sql', sql
    );
    return jsonb_build_object('ok', true, 'idx', idx, 'sql', sql, 'action', action);
  end if;

  if head = 'drop' then
    idx := idx + 1;
    if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'policy') then
      return lab_internal.fail(
        'Only CREATE POLICY, DROP POLICY, ALTER TABLE ... ROW LEVEL SECURITY, GRANT, and REVOKE are allowed.',
        lab_internal.pos(tokens, idx)
      );
    end if;
    idx := idx + 1;
    if lab_internal.word_is(lab_internal.tok(tokens, idx), 'if') then
      idx := idx + 1;
      if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'exists') then
        return lab_internal.fail('Expected EXISTS.', lab_internal.pos(tokens, idx));
      end if;
      idx := idx + 1;
      if_exists := true;
    end if;
    tok := lab_internal.tok(tokens, idx);
    if tok is null or (tok ->> 't' <> 'word' and tok ->> 't' <> 'ident') then
      return lab_internal.fail('Expected a policy name.', lab_internal.pos(tokens, idx));
    end if;
    name := case when tok ->> 't' = 'word' then lower(tok ->> 'v') else tok ->> 'v' end;
    idx := idx + 1;
    if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'on') then
      return lab_internal.fail('Expected ON.', lab_internal.pos(tokens, idx));
    end if;
    table_part := lab_internal.parse_table(tokens, idx + 1, tables);
    if not coalesce((table_part ->> 'ok')::boolean, false) then
      return table_part;
    end if;
    idx := (table_part ->> 'idx')::integer;
    table_name := table_part ->> 'sql';
    sql := 'drop policy ' || case when if_exists then 'if exists ' else '' end
      || lab_internal.qid(name) || ' on lab_sandbox.' || table_name;
    action := jsonb_build_object(
      'op', 'drop_policy',
      'table', table_name,
      'name', name,
      'sql', sql
    );
    return jsonb_build_object('ok', true, 'idx', idx, 'sql', sql, 'action', action);
  end if;

  if head = 'alter' then
    idx := idx + 1;
    if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'table') then
      return lab_internal.fail(
        'ALTER TABLE only allows ENABLE or DISABLE ROW LEVEL SECURITY.',
        lab_internal.pos(tokens, idx)
      );
    end if;
    table_part := lab_internal.parse_table(tokens, idx + 1, tables);
    if not coalesce((table_part ->> 'ok')::boolean, false) then
      return table_part;
    end if;
    idx := (table_part ->> 'idx')::integer;
    table_name := table_part ->> 'sql';
    if lab_internal.word_is(lab_internal.tok(tokens, idx), 'enable') then
      enable_rls := true;
      idx := idx + 1;
    elsif lab_internal.word_is(lab_internal.tok(tokens, idx), 'disable') then
      enable_rls := false;
      idx := idx + 1;
    else
      return lab_internal.fail(
        'ALTER TABLE only allows ENABLE or DISABLE ROW LEVEL SECURITY.',
        lab_internal.pos(tokens, idx)
      );
    end if;
    if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'row')
       or not lab_internal.word_is(lab_internal.tok(tokens, idx + 1), 'level')
       or not lab_internal.word_is(lab_internal.tok(tokens, idx + 2), 'security') then
      return lab_internal.fail(
        'ALTER TABLE only allows ENABLE or DISABLE ROW LEVEL SECURITY.',
        lab_internal.pos(tokens, idx)
      );
    end if;
    idx := idx + 3;
    sql := 'alter table lab_sandbox.' || table_name || ' '
      || case when enable_rls then 'enable' else 'disable' end
      || ' row level security';
    action := jsonb_build_object(
      'op', 'alter',
      'table', table_name,
      'enable', enable_rls,
      'sql', sql
    );
    return jsonb_build_object('ok', true, 'idx', idx, 'sql', sql, 'action', action);
  end if;

  if head in ('grant', 'revoke') then
    idx := idx + 1;
    loop
      if coalesce(lab_internal.tok(tokens, idx) ->> 't', '') <> 'word' then
        return lab_internal.fail(
          'Privilege must be SELECT, INSERT, UPDATE, DELETE, or ALL.',
          lab_internal.pos(tokens, idx)
        );
      end if;
      priv := lower(lab_internal.tok(tokens, idx) ->> 'v');
      if priv not in ('select', 'insert', 'update', 'delete', 'all') then
        return lab_internal.fail(
          'Privilege must be SELECT, INSERT, UPDATE, DELETE, or ALL.',
          lab_internal.pos(tokens, idx)
        );
      end if;
      idx := idx + 1;
      if priv = 'all' and lab_internal.word_is(lab_internal.tok(tokens, idx), 'privileges') then
        idx := idx + 1;
      end if;
      privs := privs || priv;
      exit when not lab_internal.op_is(lab_internal.tok(tokens, idx), ',');
      idx := idx + 1;
    end loop;
    if 'all' = any(privs) and cardinality(privs) > 1 then
      return lab_internal.fail('ALL cannot be combined with other privileges.', lab_internal.pos(tokens, idx));
    end if;
    if not lab_internal.word_is(lab_internal.tok(tokens, idx), 'on') then
      return lab_internal.fail('Expected ON.', lab_internal.pos(tokens, idx));
    end if;
    idx := idx + 1;
    if lab_internal.word_is(lab_internal.tok(tokens, idx), 'table') then
      idx := idx + 1;
    end if;
    table_part := lab_internal.parse_table(tokens, idx, tables);
    if not coalesce((table_part ->> 'ok')::boolean, false) then
      return table_part;
    end if;
    idx := (table_part ->> 'idx')::integer;
    table_name := table_part ->> 'sql';
    if head = 'grant' and not lab_internal.word_is(lab_internal.tok(tokens, idx), 'to') then
      return lab_internal.fail('Expected TO.', lab_internal.pos(tokens, idx));
    end if;
    if head = 'revoke' and not lab_internal.word_is(lab_internal.tok(tokens, idx), 'from') then
      return lab_internal.fail('Expected FROM.', lab_internal.pos(tokens, idx));
    end if;
    idx := idx + 1;
    roles := '[]'::jsonb;
    loop
      tok := lab_internal.tok(tokens, idx);
      if tok is null or (tok ->> 't' <> 'word' and tok ->> 't' <> 'ident') then
        return lab_internal.fail('Expected a role.', lab_internal.pos(tokens, idx));
      end if;
      role_name := lower(tok ->> 'v');
      if role_name not in ('anon', 'authenticated', 'service_role', 'public') then
        return lab_internal.fail(
          'Role must be anon, authenticated, service_role, or public.',
          (tok ->> 'p')::integer
        );
      end if;
      roles := roles || jsonb_build_array(role_name);
      idx := idx + 1;
      exit when not lab_internal.op_is(lab_internal.tok(tokens, idx), ',');
      idx := idx + 1;
    end loop;
    sql := head || ' ' || array_to_string(privs, ', ')
      || ' on table lab_sandbox.' || table_name
      || case when head = 'grant' then ' to ' else ' from ' end
      || (
        select string_agg(value, ', ' order by ord)
        from jsonb_array_elements_text(roles) with ordinality as role_list(value, ord)
      );
    action := jsonb_build_object('op', head, 'table', table_name, 'sql', sql);
    return jsonb_build_object('ok', true, 'idx', idx, 'sql', sql, 'action', action);
  end if;

  return lab_internal.fail(
    'Only CREATE POLICY, DROP POLICY, ALTER TABLE ... ROW LEVEL SECURITY, GRANT, and REVOKE are allowed.',
    (tok ->> 'p')::integer
  );
end;
$fn$;

create or replace function lab_internal.parse_policy_script(p_sql text, p_tables text[])
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $fn$
declare
  lex jsonb;
  tokens jsonb;
  idx integer := 0;
  n integer;
  statements jsonb := '[]'::jsonb;
  actions jsonb := '[]'::jsonb;
  stmt jsonb;
begin
  if p_sql is null then
    p_sql := '';
  end if;
  if char_length(p_sql) > 8000 then
    return jsonb_build_object(
      'ok', false,
      'error', 'too_large',
      'detail', 'Policy text is longer than 8000 characters.',
      'position', 1
    );
  end if;
  lex := lab_internal.tokenize(p_sql);
  if not coalesce((lex ->> 'ok')::boolean, false) then
    return lex;
  end if;
  tokens := lex -> 'tokens';
  n := jsonb_array_length(tokens);
  if n = 0 then
    return jsonb_build_object('ok', true, 'statements', '[]'::jsonb, 'actions', '[]'::jsonb);
  end if;
  while idx < n loop
    stmt := lab_internal.parse_statement(tokens, idx, p_tables);
    if not coalesce((stmt ->> 'ok')::boolean, false) then
      return stmt;
    end if;
    idx := (stmt ->> 'idx')::integer;
    statements := statements || jsonb_build_array(stmt ->> 'sql');
    actions := actions || jsonb_build_array(stmt -> 'action');
    if jsonb_array_length(statements) > 40 then
      return lab_internal.fail('More than 40 statements.', lab_internal.pos(tokens, idx));
    end if;
    if idx < n and lab_internal.op_is(lab_internal.tok(tokens, idx), ';') then
      idx := idx + 1;
    elsif idx < n then
      return lab_internal.fail('Unexpected token after a statement.', lab_internal.pos(tokens, idx));
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'statements', statements, 'actions', actions);
end;
$fn$;

create or replace function lab_internal.scenario_tables(p_slug text)
returns text[]
language sql
stable
set search_path = pg_catalog
as $$
  select case p_slug
    when 'missing-grant' then array['documents']
    when 'agent-as-alice' then array['tasks']
    when 'using-true' then array['invoices']
    when 'silent-update' then array['tickets']
    when 'team-notes' then array['notes', 'team_members']
    else null
  end;
$$;

create or replace function lab_internal.scenario_meta(p_slug text)
returns jsonb
language sql
stable
set search_path = pg_catalog
as $$
  select case p_slug
    when 'missing-grant' then jsonb_build_object(
      'main', 'documents',
      'operation', 'select',
      'query', 'select id, title, owner_id, body from lab_sandbox.documents order by id'
    )
    when 'agent-as-alice' then jsonb_build_object(
      'main', 'tasks',
      'operation', 'select',
      'query', 'select id, title, owner_id, status from lab_sandbox.tasks order by id'
    )
    when 'using-true' then jsonb_build_object(
      'main', 'invoices',
      'operation', 'select',
      'query', 'select id, title, owner_id, amount, secret from lab_sandbox.invoices order by id'
    )
    when 'silent-update' then jsonb_build_object(
      'main', 'tickets',
      'operation', 'update',
      'query', 'update lab_sandbox.tickets set status = ''closed'' where owner_id = (select auth.uid()) returning id, title, owner_id, status'
    )
    when 'team-notes' then jsonb_build_object(
      'main', 'notes',
      'operation', 'select',
      'query', 'select id, title, owner_id, team_id from lab_sandbox.notes order by id'
    )
    else null
  end;
$$;

create or replace function lab_internal.lock_down(p_table text)
returns void
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  execute format(
    'revoke all on table lab_sandbox.%I from public, anon, authenticated, service_role',
    p_table
  );
  execute format('alter table lab_sandbox.%I enable row level security', p_table);
  execute format('grant all on table lab_sandbox.%I to service_role', p_table);
end;
$fn$;

create or replace function lab_internal.setup_scenario(p_slug text)
returns void
language plpgsql
set search_path = pg_catalog
as $fn$
declare
  rel record;
begin
  for rel in
    select c.relname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'lab_sandbox' and c.relkind = 'r'
  loop
    execute format('drop table if exists lab_sandbox.%I cascade', rel.relname);
  end loop;

  if p_slug = 'missing-grant' then
    create table lab_sandbox.documents (
      id uuid primary key,
      title text not null,
      owner_id uuid,
      body text not null
    );
    insert into lab_sandbox.documents (id, title, owner_id, body) values
      ('10000000-0000-4000-8000-000000000001', 'Q4 plan', '11111111-1111-1111-1111-111111111111', 'Ship the grant fix before the demo.'),
      ('10000000-0000-4000-8000-000000000002', 'Hiring notes', '22222222-2222-2222-2222-222222222222', 'Bob''s notes stay on Bob''s side of the policy.');
    perform lab_internal.lock_down('documents');
  elsif p_slug = 'agent-as-alice' then
    create table lab_sandbox.tasks (
      id uuid primary key,
      title text not null,
      owner_id uuid,
      status text not null
    );
    insert into lab_sandbox.tasks (id, title, owner_id, status) values
      ('20000000-0000-4000-8000-000000000001', 'Ship the grant fix', '11111111-1111-1111-1111-111111111111', 'open'),
      ('20000000-0000-4000-8000-000000000002', 'Record the demo', '11111111-1111-1111-1111-111111111111', 'open'),
      ('20000000-0000-4000-8000-000000000003', 'Review the hiring notes', '22222222-2222-2222-2222-222222222222', 'open');
    perform lab_internal.lock_down('tasks');
  elsif p_slug = 'using-true' then
    create table lab_sandbox.invoices (
      id uuid primary key,
      title text not null,
      owner_id uuid,
      amount integer not null,
      secret text not null
    );
    insert into lab_sandbox.invoices (id, title, owner_id, amount, secret) values
      ('30000000-0000-4000-8000-000000000001', 'Studio invoice', '11111111-1111-1111-1111-111111111111', 4200, 'visa 4242'),
      ('30000000-0000-4000-8000-000000000002', 'Retreat invoice', '22222222-2222-2222-2222-222222222222', 1800, 'visa 4000');
    perform lab_internal.lock_down('invoices');
  elsif p_slug = 'silent-update' then
    create table lab_sandbox.tickets (
      id uuid primary key,
      title text not null,
      owner_id uuid,
      status text not null
    );
    insert into lab_sandbox.tickets (id, title, owner_id, status) values
      ('40000000-0000-4000-8000-000000000001', 'Login bug', '11111111-1111-1111-1111-111111111111', 'open'),
      ('40000000-0000-4000-8000-000000000002', 'Billing question', '22222222-2222-2222-2222-222222222222', 'open');
    perform lab_internal.lock_down('tickets');
  elsif p_slug = 'team-notes' then
    create table lab_sandbox.notes (
      id uuid primary key,
      title text not null,
      owner_id uuid,
      team_id uuid
    );
    create table lab_sandbox.team_members (
      team_id uuid not null,
      user_id uuid not null,
      primary key (team_id, user_id)
    );
    insert into lab_sandbox.notes (id, title, owner_id, team_id) values
      ('50000000-0000-4000-8000-000000000001', 'Grocery list', '11111111-1111-1111-1111-111111111111', null),
      ('50000000-0000-4000-8000-000000000002', 'Sprint plan', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      ('50000000-0000-4000-8000-000000000003', '1:1 notes', '22222222-2222-2222-2222-222222222222', null),
      ('50000000-0000-4000-8000-000000000004', 'Launch checklist', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      ('50000000-0000-4000-8000-000000000005', 'Roadmap', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    insert into lab_sandbox.team_members (team_id, user_id) values
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333');
    perform lab_internal.lock_down('notes');
    perform lab_internal.lock_down('team_members');
  else
    raise exception 'Unknown scenario';
  end if;
end;
$fn$;
-- Postgres refuses SET ROLE inside a security definer function.
-- These wrappers are owned by the target role, so current_user becomes that
-- role and both grants and row level security apply for real.
create or replace function lab_internal.perform_query(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $fn$
declare
  v_slug text := payload ->> 'slug';
  v_operation text := payload ->> 'operation';
  v_trace text := payload ->> 'trace';
  v_after text := payload ->> 'after';
  v_sub text := payload ->> 'sub';
  v_claims jsonb := payload -> 'claims';
  v_policies jsonb := coalesce(payload -> 'policies', '[]'::jsonb);
  v_fixture jsonb := coalesce(payload -> 'fixture', '[]'::jsonb);
  v_returned jsonb := '[]'::jsonb;
  v_sqlstate text;
  v_errmsg text;
  v_rows jsonb := '[]'::jsonb;
  v_item jsonb;
  v_pol jsonb;
  v_checks jsonb;
  v_id uuid;
  v_pred boolean;
  v_using boolean;
  v_check boolean;
  v_expr text;
begin
  perform set_config('request.jwt.claims', coalesce(v_claims, '{}'::jsonb)::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);
  perform set_config('request.jwt.claim.role', current_user, true);

  begin
    if v_slug = 'missing-grant' then
      select coalesce(jsonb_agg(to_jsonb(q) order by q.id), '[]'::jsonb)
        into v_returned
      from (
        select id, title, owner_id, body
        from lab_sandbox.documents
        order by id
      ) q;
    elsif v_slug = 'agent-as-alice' then
      select coalesce(jsonb_agg(to_jsonb(q) order by q.id), '[]'::jsonb)
        into v_returned
      from (
        select id, title, owner_id, status
        from lab_sandbox.tasks
        order by id
      ) q;
    elsif v_slug = 'using-true' then
      select coalesce(jsonb_agg(to_jsonb(q) order by q.id), '[]'::jsonb)
        into v_returned
      from (
        select id, title, owner_id, amount, secret
        from lab_sandbox.invoices
        order by id
      ) q;
    elsif v_slug = 'silent-update' then
      execute $query$
        with q as (
          update lab_sandbox.tickets
          set status = 'closed'
          where owner_id = (select auth.uid())
          returning id, title, owner_id, status
        )
        select coalesce(jsonb_agg(to_jsonb(q) order by q.id), '[]'::jsonb)
        from q
      $query$ into v_returned;
    elsif v_slug = 'team-notes' then
      select coalesce(jsonb_agg(to_jsonb(q) order by q.id), '[]'::jsonb)
        into v_returned
      from (
        select id, title, owner_id, team_id
        from lab_sandbox.notes
        order by id
      ) q;
    end if;
    v_sqlstate := null;
    v_errmsg := null;
  exception when others then
    v_sqlstate := SQLSTATE;
    v_errmsg := SQLERRM;
    v_returned := '[]'::jsonb;
  end;

  for v_item in select value from jsonb_array_elements(v_fixture) loop
    v_id := (v_item ->> 'id')::uuid;
    v_checks := '[]'::jsonb;
    if v_operation = 'select' then
      v_pred := true;
    else
      begin
        execute format(
          'select (owner_id = (select auth.uid())) from lab_sandbox.%I where id = $1',
          v_trace
        ) into v_pred using v_id;
        v_pred := coalesce(v_pred, false);
      exception when others then
        v_pred := false;
      end;
    end if;

    for v_pol in select value from jsonb_array_elements(v_policies) loop
      if v_pol ->> 'table' is distinct from payload ->> 'main' and v_pol ->> 'table' is not null then
        if v_pol ->> 'table' <> replace(v_trace, '__trace_', '') then
          continue;
        end if;
      end if;
      if v_pol ->> 'table' <> replace(v_trace, '__trace_', '') then
        continue;
      end if;
      v_using := null;
      v_check := null;
      v_expr := v_pol ->> 'usingExpr';
      if v_expr is not null then
        begin
          execute format(
            'select (%s) from lab_sandbox.%I where id = $1',
            v_expr,
            v_trace
          ) into v_using using v_id;
        exception when others then
          v_using := null;
        end;
      end if;
      v_expr := v_pol ->> 'withCheckExpr';
      if v_expr is not null and v_operation = 'update' then
        begin
          execute format(
            'select (%s) from lab_sandbox.%I where id = $1',
            v_expr,
            v_after
          ) into v_check using v_id;
        exception when others then
          v_check := null;
        end;
      end if;
      v_checks := v_checks || jsonb_build_array(jsonb_build_object(
        'table', v_pol ->> 'table',
        'name', v_pol ->> 'name',
        'using', v_using,
        'withCheck', v_check
      ));
    end loop;

    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'data', v_item,
      'queryPredicate', coalesce(v_pred, false),
      'checks', v_checks
    ));
  end loop;

  return jsonb_build_object(
    'sqlstate', v_sqlstate,
    'errorMessage', v_errmsg,
    'returned', v_returned,
    'rows', v_rows
  );
end;
$fn$;

-- Hosted Supabase runs migrations as postgres, which is not a superuser.
-- Giving a function to anon/authenticated/service_role requires that role to
-- have CREATE on the schema at that moment. A superuser skips the check.
-- The privilege is granted only for the ownership change, then revoked.
-- Each wrapper is a copy of perform_query, so those roles do not need USAGE
-- on lab_internal afterwards. They cannot call the parser or perform_query.
do $clone$
declare
  def text;
  body text;
  target text;
  owner_name text;
  migrator text := current_user;
begin
  def := pg_get_functiondef('lab_internal.perform_query(jsonb)'::regprocedure);
  body := substring(def from '\$function\$(.*)\$function\$');
  if body is null or char_length(body) < 20 then
    raise exception 'could not clone lab_internal.perform_query';
  end if;

  foreach target in array array['anon', 'authenticated', 'service_role']
  loop
    select r.rolname into owner_name
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_roles r on r.oid = p.proowner
    where n.nspname = 'lab_internal'
      and p.proname = 'exec_as_' || target
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'payload jsonb';

    if owner_name is not null and owner_name <> migrator then
      begin
        -- The owning role has no schema privilege after the previous run.
        -- Grant usage only so it can drop its own function, then take it back.
        execute format('grant usage on schema lab_internal to %I', owner_name);
        execute format('set role %I', owner_name);
        execute format('drop function lab_internal.exec_as_%s(jsonb)', target);
        execute format('set role %I', migrator);
        execute format('revoke all on schema lab_internal from %I', owner_name);
      exception
        when others then
          execute format('set role %I', migrator);
          raise;
      end;
    elsif owner_name is not null then
      execute format('drop function lab_internal.exec_as_%s(jsonb)', target);
    end if;

    execute
      'create function lab_internal.exec_as_' || target || '(payload jsonb)
         returns jsonb
         language plpgsql
         security definer
         set search_path = pg_catalog
         as $clonebody$' || body || '$clonebody$';

    execute format('grant usage, create on schema lab_internal to %I', target);
    execute format(
      'alter function lab_internal.exec_as_%s(jsonb) owner to %I',
      target,
      target
    );
    -- Granting to the current owner does not survive the ownership change.
    -- The new owner has to grant the migration role explicitly.
    begin
      execute format('set role %I', target);
      execute format(
        'grant execute on function lab_internal.exec_as_%s(jsonb) to %I',
        target,
        migrator
      );
      execute format('set role %I', migrator);
    exception
      when others then
        execute format('set role %I', migrator);
        raise;
    end;
    execute format('revoke all on schema lab_internal from %I', target);
  end loop;
end;
$clone$;

create or replace function lab_internal.evaluate_lab(
  p_slug text,
  p_actions jsonb,
  p_identity text,
  p_role text,
  p_sub text,
  p_claims jsonb
) returns jsonb
language plpgsql
set search_path = pg_catalog
as $fn$
declare
  v_meta jsonb := lab_internal.scenario_meta(p_slug);
  v_main text := v_meta ->> 'main';
  v_operation text := v_meta ->> 'operation';
  v_query text := v_meta ->> 'query';
  v_action jsonb;
  v_policies jsonb := '[]'::jsonb;
  v_trace text := '__trace_' || (v_meta ->> 'main');
  v_after text := '__after_' || (v_meta ->> 'main');
  v_fixture jsonb;
  v_rls boolean;
  v_bypass boolean;
  v_sel boolean;
  v_ins boolean;
  v_upd boolean;
  v_del boolean;
  v_returned jsonb := '[]'::jsonb;
  v_sqlstate text;
  v_errmsg text;
  v_rows jsonb := '[]'::jsonb;
  v_item jsonb;
  v_pol jsonb;
  v_checks jsonb;
  v_id uuid;
  v_pred boolean;
  v_using boolean;
  v_check boolean;
  v_expr text;
  v_out_policies jsonb := '[]'::jsonb;
  v_affected integer;
  v_payload jsonb;
  v_exec jsonb;
begin
  perform lab_internal.setup_scenario(p_slug);

  for v_action in select value from jsonb_array_elements(coalesce(p_actions, '[]'::jsonb)) loop
    execute v_action ->> 'sql';
    if v_action ->> 'op' = 'create_policy' then
      select coalesce(jsonb_agg(item), '[]'::jsonb)
        into v_policies
      from jsonb_array_elements(v_policies) item
      where not (
        item ->> 'table' = v_action ->> 'table'
        and item ->> 'name' = v_action ->> 'name'
      );
      v_policies := coalesce(v_policies, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'table', v_action ->> 'table',
        'name', v_action ->> 'name',
        'command', v_action ->> 'command',
        'permissive', v_action -> 'permissive',
        'roles', v_action -> 'roles',
        'usingExpr', v_action -> 'usingExpr',
        'withCheckExpr', v_action -> 'withCheckExpr'
      ));
    elsif v_action ->> 'op' = 'drop_policy' then
      select coalesce(jsonb_agg(item), '[]'::jsonb)
        into v_policies
      from jsonb_array_elements(v_policies) item
      where not (
        item ->> 'table' = v_action ->> 'table'
        and item ->> 'name' = v_action ->> 'name'
      );
      v_policies := coalesce(v_policies, '[]'::jsonb);
    end if;
  end loop;

  execute format(
    'select c.relrowsecurity from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = %L and c.relname = %L',
    'lab_sandbox',
    v_main
  ) into v_rls;

  select r.rolbypassrls into v_bypass
  from pg_catalog.pg_roles r
  where r.rolname = p_role;

  v_sel := has_table_privilege(p_role, format('lab_sandbox.%I', v_main), 'SELECT');
  v_ins := has_table_privilege(p_role, format('lab_sandbox.%I', v_main), 'INSERT');
  v_upd := has_table_privilege(p_role, format('lab_sandbox.%I', v_main), 'UPDATE');
  v_del := has_table_privilege(p_role, format('lab_sandbox.%I', v_main), 'DELETE');

  execute format(
    'select coalesce(jsonb_agg(to_jsonb(t) order by t.id), ''[]''::jsonb) from lab_sandbox.%I t',
    v_main
  ) into v_fixture;

  execute format(
    'create table lab_sandbox.%I (like lab_sandbox.%I including all)',
    v_trace, v_main
  );
  execute format(
    'insert into lab_sandbox.%I select * from lab_sandbox.%I',
    v_trace, v_main
  );
  execute format('revoke all on table lab_sandbox.%I from public', v_trace);
  execute format(
    'grant select on table lab_sandbox.%I to anon, authenticated, service_role',
    v_trace
  );

  if v_operation = 'update' then
    execute format(
      'create table lab_sandbox.%I (like lab_sandbox.%I including all)',
      v_after, v_main
    );
    execute format(
      'insert into lab_sandbox.%I select * from lab_sandbox.%I',
      v_after, v_main
    );
    execute format('update lab_sandbox.%I set status = %L', v_after, 'closed');
    execute format('revoke all on table lab_sandbox.%I from public', v_after);
    execute format(
      'grant select on table lab_sandbox.%I to anon, authenticated, service_role',
      v_after
    );
  end if;

  v_payload := jsonb_build_object(
    'slug', p_slug,
    'operation', v_operation,
    'trace', v_trace,
    'after', v_after,
    'sub', p_sub,
    'claims', p_claims,
    'policies', v_policies,
    'fixture', v_fixture
  );
  v_exec := case p_role
    when 'anon' then lab_internal.exec_as_anon(v_payload)
    when 'authenticated' then lab_internal.exec_as_authenticated(v_payload)
    else lab_internal.exec_as_service_role(v_payload)
  end;
  v_returned := coalesce(v_exec -> 'returned', '[]'::jsonb);
  v_sqlstate := nullif(v_exec ->> 'sqlstate', '');
  v_errmsg := v_exec ->> 'errorMessage';
  v_rows := coalesce(v_exec -> 'rows', '[]'::jsonb);

  for v_pol in select value from jsonb_array_elements(v_policies) loop
    v_out_policies := v_out_policies || jsonb_build_array(jsonb_build_object(
      'table', v_pol ->> 'table',
      'name', v_pol ->> 'name',
      'command', v_pol ->> 'command',
      'permissive', v_pol -> 'permissive',
      'roles', v_pol -> 'roles',
      'applies', (
        (v_pol -> 'roles') @> jsonb_build_array('public')
        or (v_pol -> 'roles') @> jsonb_build_array(p_role)
      ),
      'usingExpr', v_pol -> 'usingExpr',
      'withCheckExpr', v_pol -> 'withCheckExpr'
    ));
  end loop;

  if v_operation = 'update' then
    if v_sqlstate is null then
      v_affected := coalesce(jsonb_array_length(v_returned), 0);
    else
      v_affected := 0;
    end if;
  else
    v_affected := null;
  end if;

  return jsonb_build_object(
    'ok', true,
    'scenario', p_slug,
    'identity', jsonb_build_object(
      'id', p_identity,
      'role', p_role,
      'sub', p_sub,
      'bypassesRls', coalesce(v_bypass, false)
    ),
    'operation', v_operation,
    'table', v_main,
    'query', v_query,
    'sqlstate', v_sqlstate,
    'errorMessage', v_errmsg,
    'rlsEnabled', coalesce(v_rls, false),
    'grants', jsonb_build_array(
      jsonb_build_object('privilege', 'SELECT', 'allowed', v_sel),
      jsonb_build_object('privilege', 'INSERT', 'allowed', v_ins),
      jsonb_build_object('privilege', 'UPDATE', 'allowed', v_upd),
      jsonb_build_object('privilege', 'DELETE', 'allowed', v_del)
    ),
    'rowsAffected', v_affected,
    'returned', coalesce(v_returned, '[]'::jsonb),
    'rows', v_rows,
    'policies', v_out_policies
  );
end;
$fn$;

create or replace function public.run_lab(
  p_scenario_slug text,
  p_policy_sql text,
  p_identity text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $fn$
declare
  v_tables text[];
  v_parsed jsonb;
  v_role text;
  v_sub text;
  v_claims jsonb;
  v_result jsonb;
begin
  if p_identity not in ('anon', 'alice', 'bob', 'agent-alice', 'service_role') then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_identity',
      'detail', 'Identity must be anon, alice, bob, agent-alice, or service_role.'
    );
  end if;

  v_tables := lab_internal.scenario_tables(p_scenario_slug);
  if v_tables is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'unknown_scenario',
      'detail', 'Unknown scenario.'
    );
  end if;

  if p_policy_sql is null then
    p_policy_sql := '';
  end if;
  if char_length(p_policy_sql) > 8000 then
    return jsonb_build_object(
      'ok', false,
      'error', 'too_large',
      'detail', 'Policy text is longer than 8000 characters.'
    );
  end if;

  v_parsed := lab_internal.parse_policy_script(p_policy_sql, v_tables);
  if not coalesce((v_parsed ->> 'ok')::boolean, false) then
    return v_parsed;
  end if;

  v_role := case
    when p_identity in ('alice', 'bob', 'agent-alice') then 'authenticated'
    else p_identity
  end;
  v_sub := case p_identity
    when 'alice' then '11111111-1111-1111-1111-111111111111'
    when 'bob' then '22222222-2222-2222-2222-222222222222'
    when 'agent-alice' then '11111111-1111-1111-1111-111111111111'
    else null
  end;
  v_claims := case p_identity
    when 'anon' then jsonb_build_object('role', 'anon')
    when 'alice' then jsonb_build_object(
      'sub', v_sub, 'role', 'authenticated', 'aud', 'authenticated', 'email', 'alice@example.com'
    )
    when 'bob' then jsonb_build_object(
      'sub', v_sub, 'role', 'authenticated', 'aud', 'authenticated', 'email', 'bob@example.com'
    )
    when 'agent-alice' then jsonb_build_object(
      'sub', v_sub,
      'role', 'authenticated',
      'aud', 'authenticated',
      'email', 'alice@example.com',
      'app_metadata', jsonb_build_object('agent', true, 'tool', 'list_tasks')
    )
    else jsonb_build_object('role', 'service_role')
  end;

  begin
    perform set_config('statement_timeout', '2000', true);
    v_result := lab_internal.evaluate_lab(
      p_scenario_slug,
      v_parsed -> 'actions',
      p_identity,
      v_role,
      v_sub,
      v_claims
    );
    raise exception using errcode = 'P0001', message = 'policy_trace_rollback';
  exception
    when sqlstate 'P0001' then
      return v_result;
    when others then
      return jsonb_build_object(
        'ok', false,
        'error', 'apply_failed',
        'sqlstate', SQLSTATE,
        'detail', SQLERRM
      );
  end;
end;
$fn$;

create or replace function public.create_lab_share(
  p_scenario_slug text,
  p_policy_sql text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $fn$
declare
  v_tables text[];
  v_parsed jsonb;
  v_lab uuid;
  v_share uuid;
begin
  v_tables := lab_internal.scenario_tables(p_scenario_slug);
  if v_tables is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'unknown_scenario',
      'detail', 'Unknown scenario.'
    );
  end if;
  if p_policy_sql is null then
    p_policy_sql := '';
  end if;
  if char_length(p_policy_sql) > 8000 then
    return jsonb_build_object(
      'ok', false,
      'error', 'too_large',
      'detail', 'Policy text is longer than 8000 characters.'
    );
  end if;
  v_parsed := lab_internal.parse_policy_script(p_policy_sql, v_tables);
  if not coalesce((v_parsed ->> 'ok')::boolean, false) then
    return v_parsed;
  end if;

  insert into public.labs (scenario_slug, policy_sql)
  values (p_scenario_slug, p_policy_sql)
  returning id into v_lab;

  insert into public.lab_shares (lab_id, scenario_slug, policy_sql)
  values (v_lab, p_scenario_slug, p_policy_sql)
  returning id into v_share;

  return jsonb_build_object('ok', true, 'id', v_share, 'labId', v_lab);
end;
$fn$;

create or replace function public.get_lab_share(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $fn$
declare
  v_lab uuid;
  v_slug text;
  v_sql text;
  v_created timestamptz;
begin
  select lab_id, scenario_slug, policy_sql, created_at
    into v_lab, v_slug, v_sql, v_created
  from public.lab_shares
  where id = p_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found',
      'detail', 'No share with that id.'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', p_id,
    'labId', v_lab,
    'scenario', v_slug,
    'policySql', v_sql,
    'createdAt', v_created
  );
end;
$fn$;

revoke all on all functions in schema lab_internal from public, anon, authenticated, service_role;
revoke all on schema lab_internal from public, anon, authenticated, service_role;
revoke all on function public.run_lab(text, text, text) from public;
revoke all on function public.create_lab_share(text, text) from public;
revoke all on function public.get_lab_share(uuid) from public;

grant execute on function public.run_lab(text, text, text) to anon, authenticated, service_role;
grant execute on function public.create_lab_share(text, text) to anon, authenticated, service_role;
grant execute on function public.get_lab_share(uuid) to anon, authenticated, service_role;

alter function public.run_lab(text, text, text) set statement_timeout = '2s';
alter function public.run_lab(text, text, text) set search_path = pg_catalog;
