export const MAX_POLICY_CHARS = 8000;
export const MAX_STATEMENTS = 40;
const MAX_DEPTH = 12;
const MAX_IDENT = 63;

const ROLES = new Set(["anon", "authenticated", "service_role", "public"]);
const PRIVS = new Set(["select", "insert", "update", "delete", "all"]);
const COMMANDS = new Set(["all", "select", "insert", "update", "delete"]);
const CAST_TYPES = new Set(["uuid", "text", "boolean"]);

const QUOTE_KEYWORDS = new Set([
  "select",
  "insert",
  "update",
  "delete",
  "all",
  "user",
  "table",
  "grant",
  "revoke",
  "create",
  "drop",
  "alter",
  "policy",
  "true",
  "false",
  "null",
  "and",
  "or",
  "not",
  "exists",
  "where",
  "from",
  "as",
  "on",
  "to",
  "check",
  "using",
  "for",
  "enable",
  "disable",
  "row",
  "level",
  "security",
  "if",
  "with",
  "privileges",
  "restrictive",
  "permissive",
  "in",
  "is",
]);

export type ParseSuccess = { ok: true; statements: string[] };
export type ParseFailure = {
  ok: false;
  error: "rejected";
  detail: string;
  position: number;
};
export type ParseResult = ParseSuccess | ParseFailure;

type Token =
  | { kind: "word"; value: string; position: number }
  | { kind: "ident"; value: string; position: number }
  | { kind: "string"; value: string; position: number }
  | { kind: "number"; value: string; position: number }
  | { kind: "op"; value: string; position: number };

class ParseError extends Error {
  position: number;

  constructor(detail: string, position: number) {
    super(detail);
    this.position = position;
  }
}

export function quoteIdent(name: string): string {
  if (/^[a-z_][a-z0-9_]*$/.test(name) && !QUOTE_KEYWORDS.has(name)) {
    return name;
  }
  return `"${name.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function parsePolicyScript(sql: string, tables: readonly string[]): ParseResult {
  try {
    if (sql.includes("\0")) {
      return rejected("Policy text contains a null byte.", 1);
    }
    if (sql.length > MAX_POLICY_CHARS) {
      return rejected(
        `Policy text is longer than ${MAX_POLICY_CHARS} characters.`,
        1,
      );
    }
    const tokens = tokenize(sql);
    const parser = new Parser(tokens, new Set(tables));
    const statements = parser.parseScript();
    return { ok: true, statements };
  } catch (error) {
    if (error instanceof ParseError) {
      return rejected(error.message, error.position);
    }
    throw error;
  }
}

function rejected(detail: string, position: number): ParseFailure {
  return { ok: false, error: "rejected", detail, position };
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  const n = sql.length;
  let i = 0;

  const peek = (offset = 0) => sql[i + offset] ?? "";

  while (i < n) {
    const c = peek();
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === "-" && peek(1) === "-") {
      i += 2;
      while (i < n && peek() !== "\n") i += 1;
      continue;
    }
    if (c === "/" && peek(1) === "*") {
      const start = i + 1;
      i += 2;
      while (i < n && !(peek() === "*" && peek(1) === "/")) i += 1;
      if (i >= n) throw new ParseError("Unclosed block comment.", start);
      i += 2;
      continue;
    }
    if (c === "$") {
      throw new ParseError("Dollar quoting is not allowed.", i + 1);
    }
    if (c === "'") {
      const start = i + 1;
      i += 1;
      let value = "";
      let closed = false;
      while (i < n) {
        if (peek() === "'") {
          if (peek(1) === "'") {
            value += "'";
            i += 2;
            continue;
          }
          i += 1;
          closed = true;
          break;
        }
        value += peek();
        i += 1;
      }
      if (!closed) throw new ParseError("Unclosed string.", start);
      tokens.push({ kind: "string", value, position: start });
      continue;
    }
    if (c === '"') {
      const start = i + 1;
      i += 1;
      let value = "";
      let closed = false;
      while (i < n) {
        if (peek() === '"') {
          if (peek(1) === '"') {
            value += '"';
            i += 2;
            continue;
          }
          i += 1;
          closed = true;
          break;
        }
        const ch = peek();
        if (ch === ";" || ch === "\0") {
          throw new ParseError("This character is not allowed in an identifier.", i + 1);
        }
        value += ch;
        i += 1;
      }
      if (!closed) throw new ParseError("Unclosed quoted identifier.", start);
      if (value.length === 0 || value.length > MAX_IDENT) {
        throw new ParseError("Identifier length must be between 1 and 63.", start);
      }
      tokens.push({ kind: "ident", value, position: start });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const start = i + 1;
      let value = "";
      while (i < n && /[A-Za-z0-9_]/.test(peek())) {
        value += peek();
        i += 1;
      }
      tokens.push({ kind: "word", value, position: start });
      continue;
    }
    if (/[0-9]/.test(c)) {
      const start = i + 1;
      let value = "";
      while (i < n && /[0-9]/.test(peek())) {
        value += peek();
        i += 1;
      }
      tokens.push({ kind: "number", value, position: start });
      continue;
    }
    const three = sql.slice(i, i + 3);
    const two = sql.slice(i, i + 2);
    if (three === "->>") {
      tokens.push({ kind: "op", value: "->>", position: i + 1 });
      i += 3;
      continue;
    }
    if (["->", "::", "<>", "!=", "<=", ">="].includes(two)) {
      tokens.push({ kind: "op", value: two, position: i + 1 });
      i += 2;
      continue;
    }
    if ("(),.=<>;".includes(c)) {
      tokens.push({ kind: "op", value: c, position: i + 1 });
      i += 1;
      continue;
    }
    throw new ParseError(`Unexpected character "${c}".`, i + 1);
  }

  return tokens;
}

class Parser {
  private idx = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly tables: Set<string>,
  ) {}

  parseScript(): string[] {
    const statements: string[] = [];
    if (this.tokens.length === 0) return statements;
    while (!this.done()) {
      statements.push(this.parseStatement());
      if (statements.length > MAX_STATEMENTS) {
        throw new ParseError(`More than ${MAX_STATEMENTS} statements.`, this.pos());
      }
      if (this.matchOp(";")) continue;
      if (!this.done()) {
        throw new ParseError("Unexpected token after a statement.", this.pos());
      }
    }
    return statements;
  }

  private parseStatement(): string {
    const word = this.peekWord();
    if (word === "create") return this.parseCreatePolicy();
    if (word === "drop") return this.parseDropPolicy();
    if (word === "alter") return this.parseAlter();
    if (word === "grant") return this.parseGrant(false);
    if (word === "revoke") return this.parseGrant(true);
    throw new ParseError(
      "Only CREATE POLICY, DROP POLICY, ALTER TABLE ... ROW LEVEL SECURITY, GRANT, and REVOKE are allowed.",
      this.pos(),
    );
  }

  private parseCreatePolicy(): string {
    this.expectWord("create");
    this.expectWord("policy");
    const name = this.parseName();
    this.expectWord("on");
    const table = this.parseTable();
    let permissive = true;
    if (this.matchWord("as")) {
      if (this.matchWord("permissive")) permissive = true;
      else if (this.matchWord("restrictive")) permissive = false;
      else throw new ParseError("Expected PERMISSIVE or RESTRICTIVE.", this.pos());
    }
    let command = "all";
    if (this.matchWord("for")) {
      const cmd = this.expectAnyWord([...COMMANDS], "Expected a command.");
      command = cmd;
    }
    let roles = ["public"];
    if (this.matchWord("to")) roles = this.parseRoleList();
    let usingSql: string | null = null;
    let checkSql: string | null = null;
    if (this.matchWord("using")) {
      this.expectOp("(");
      usingSql = this.parseExpr();
      this.expectOp(")");
    }
    if (this.matchWord("with")) {
      this.expectWord("check");
      this.expectOp("(");
      checkSql = this.parseExpr();
      this.expectOp(")");
    }
    if (!usingSql && !checkSql) {
      throw new ParseError("A policy needs USING, WITH CHECK, or both.", this.pos());
    }
    const parts = [
      `create policy ${quoteIdent(name)} on lab_sandbox.${table}`,
      `as ${permissive ? "permissive" : "restrictive"}`,
      `for ${command}`,
      `to ${roles.join(", ")}`,
    ];
    if (usingSql) parts.push(`using (${usingSql})`);
    if (checkSql) parts.push(`with check (${checkSql})`);
    return parts.join(" ");
  }

  private parseDropPolicy(): string {
    this.expectWord("drop");
    this.expectWord("policy");
    const ifExists = this.matchWord("if") ? (this.expectWord("exists"), true) : false;
    const name = this.parseName();
    this.expectWord("on");
    const table = this.parseTable();
    return `drop policy ${ifExists ? "if exists " : ""}${quoteIdent(name)} on lab_sandbox.${table}`;
  }

  private parseAlter(): string {
    this.expectWord("alter");
    this.expectWord("table");
    const table = this.parseTable();
    const enable = this.matchWord("enable")
      ? true
      : this.matchWord("disable")
        ? false
        : null;
    if (enable === null) {
      throw new ParseError(
        "ALTER TABLE only allows ENABLE or DISABLE ROW LEVEL SECURITY.",
        this.pos(),
      );
    }
    this.expectWord("row");
    this.expectWord("level");
    this.expectWord("security");
    return `alter table lab_sandbox.${table} ${enable ? "enable" : "disable"} row level security`;
  }

  private parseGrant(revoke: boolean): string {
    this.expectWord(revoke ? "revoke" : "grant");
    const privs = this.parsePrivList();
    this.expectWord("on");
    this.matchWord("table");
    const table = this.parseTable();
    this.expectWord(revoke ? "from" : "to");
    const roles = this.parseRoleList();
    const verb = revoke ? "revoke" : "grant";
    const direction = revoke ? "from" : "to";
    return `${verb} ${privs.join(", ")} on table lab_sandbox.${table} ${direction} ${roles.join(", ")}`;
  }

  private parsePrivList(): string[] {
    const privs: string[] = [];
    do {
      const priv = this.expectAnyWord([...PRIVS], "Privilege must be SELECT, INSERT, UPDATE, DELETE, or ALL.");
      if (priv === "all") this.matchWord("privileges");
      privs.push(priv);
    } while (this.matchOp(","));
    if (privs.includes("all") && privs.length > 1) {
      throw new ParseError("ALL cannot be combined with other privileges.", this.pos());
    }
    return privs;
  }

  private parseRoleList(): string[] {
    const roles: string[] = [];
    do {
      roles.push(this.parseRole());
    } while (this.matchOp(","));
    return roles;
  }

  private parseRole(): string {
    const token = this.peek();
    if (!token) throw new ParseError("Expected a role.", this.pos());
    const raw = token.kind === "word" || token.kind === "ident" ? token.value : "";
    const role = raw.toLowerCase();
    if (!ROLES.has(role)) {
      throw new ParseError(
        "Role must be anon, authenticated, service_role, or public.",
        token.position,
      );
    }
    this.idx += 1;
    return role;
  }

  private parseName(): string {
    const token = this.peek();
    if (!token || (token.kind !== "word" && token.kind !== "ident")) {
      throw new ParseError("Expected a policy name.", this.pos());
    }
    if (token.value.length > MAX_IDENT) {
      throw new ParseError("Identifier length must be between 1 and 63.", token.position);
    }
    this.idx += 1;
    return token.kind === "word" ? token.value.toLowerCase() : token.value;
  }

  private parseTable(): string {
    const start = this.pos();
    if (!this.matchWord("lab_sandbox")) {
      throw new ParseError(
        "Table must be schema-qualified as lab_sandbox.<table>.",
        start,
      );
    }
    this.expectOp(".");
    const token = this.peek();
    if (!token || (token.kind !== "word" && token.kind !== "ident")) {
      throw new ParseError("Expected a table name.", this.pos());
    }
    const name = token.value.toLowerCase();
    if (!/^[a-z_][a-z0-9_]*$/.test(name) || !this.tables.has(name)) {
      throw new ParseError("Table is not part of this scenario.", token.position);
    }
    this.idx += 1;
    return name;
  }

  private parseExpr(depth = 0): string {
    return this.parseOr(depth);
  }

  private parseOr(depth: number): string {
    this.guardDepth(depth);
    let left = this.parseAnd(depth + 1);
    while (this.matchWord("or")) {
      const right = this.parseAnd(depth + 1);
      left = `(${left} or ${right})`;
    }
    return left;
  }

  private parseAnd(depth: number): string {
    this.guardDepth(depth);
    let left = this.parseNot(depth + 1);
    while (this.matchWord("and")) {
      const right = this.parseNot(depth + 1);
      left = `(${left} and ${right})`;
    }
    return left;
  }

  private parseNot(depth: number): string {
    this.guardDepth(depth);
    if (this.matchWord("not")) {
      return `(not ${this.parseNot(depth + 1)})`;
    }
    return this.parsePred(depth);
  }

  private parsePred(depth: number): string {
    this.guardDepth(depth);
    if (this.matchWord("exists")) {
      this.expectOp("(");
      const subquery = this.parseSubquery(depth + 1);
      this.expectOp(")");
      return `(exists (${subquery}))`;
    }
    const left = this.parseValue(depth);
    const op = this.peek();
    if (op?.kind === "op" && ["=", "<>", "!=", "<", ">", "<=", ">="].includes(op.value)) {
      this.idx += 1;
      const right = this.parseValue(depth);
      const canonical = op.value === "!=" ? "<>" : op.value;
      return `(${left} ${canonical} ${right})`;
    }
    if (this.matchWord("is")) {
      const negate = this.matchWord("not");
      this.expectWord("null");
      return negate ? `(${left} is not null)` : `(${left} is null)`;
    }
    if (this.matchWord("in")) {
      return this.parseIn(left, depth);
    }
    return left;
  }

  private parseIn(left: string, depth: number): string {
    this.expectOp("(");
    if (this.peekWord() === "select") {
      const subquery = this.parseSubquery(depth + 1);
      this.expectOp(")");
      return `(${left} in (${subquery}))`;
    }
    const items: string[] = [];
    do {
      items.push(this.parseLiteral());
    } while (this.matchOp(","));
    this.expectOp(")");
    return `(${left} in (${items.join(", ")}))`;
  }

  private parseLiteral(): string {
    const token = this.peek();
    if (!token) throw new ParseError("Expected a literal.", this.pos());
    if (token.kind === "string") {
      this.idx += 1;
      return quoteLiteral(token.value);
    }
    if (token.kind === "number") {
      this.idx += 1;
      return token.value;
    }
    if (token.kind === "word" && ["true", "false", "null"].includes(token.value.toLowerCase())) {
      this.idx += 1;
      return token.value.toLowerCase();
    }
    throw new ParseError(
      "IN lists only allow literals. Query a lab_sandbox table with IN (SELECT ...).",
      token.position,
    );
  }

  private parseSubquery(depth: number): string {
    this.guardDepth(depth);
    this.expectWord("select");
    const item = this.parseSelectItem();
    this.expectWord("from");
    const table = this.parseTable();
    let alias = "";
    if (this.matchWord("as")) {
      alias = ` ${this.parseAlias()}`;
    } else if (this.peek()?.kind === "word" && this.peekWord() !== "where") {
      alias = ` ${this.parseAlias()}`;
    }
    let where = "";
    if (this.matchWord("where")) {
      where = ` where ${this.parseExpr(depth + 1)}`;
    }
    return `select ${item} from lab_sandbox.${table}${alias}${where}`;
  }

  private parseSelectItem(): string {
    if (this.peek()?.kind === "number") {
      const token = this.tokens[this.idx];
      this.idx += 1;
      return token.value;
    }
    return this.parseColumn();
  }

  private parseAlias(): string {
    const token = this.peek();
    if (!token || token.kind !== "word") {
      throw new ParseError("Expected a table alias.", this.pos());
    }
    const alias = token.value.toLowerCase();
    if (QUOTE_KEYWORDS.has(alias) || !/^[a-z_][a-z0-9_]*$/.test(alias)) {
      throw new ParseError("That alias is not allowed.", token.position);
    }
    this.idx += 1;
    return alias;
  }

  private parseValue(depth: number): string {
    this.guardDepth(depth);
    const token = this.peek();
    if (!token) throw new ParseError("Expected an expression.", this.pos());

    if (token.kind === "op" && token.value === "(") {
      const next = this.tokens[this.idx + 1];
      if (next?.kind === "word" && next.value.toLowerCase() === "select") {
        this.idx += 1;
        this.idx += 1;
        const call = this.parseAuthCall();
        this.expectOp(")");
        if (this.peekWord() === "from") {
          throw new ParseError(
            "A scalar subquery may only call auth.uid() or auth.jwt().",
            this.pos(),
          );
        }
        return this.applyCast(`(select ${call})`);
      }
      this.idx += 1;
      const inner = this.parseExpr(depth + 1);
      this.expectOp(")");
      return this.applyCast(inner);
    }

    if (token.kind === "word" && token.value.toLowerCase() === "auth") {
      return this.applyCast(this.parseAuthCall());
    }

    if (token.kind === "word" && ["true", "false", "null"].includes(token.value.toLowerCase())) {
      this.idx += 1;
      return this.applyCast(token.value.toLowerCase());
    }

    if (token.kind === "string") {
      this.idx += 1;
      return this.applyCast(quoteLiteral(token.value));
    }

    if (token.kind === "number") {
      this.idx += 1;
      return this.applyCast(token.value);
    }

    if (token.kind === "word" || token.kind === "ident") {
      return this.applyCast(this.parseColumn());
    }

    throw new ParseError(
      "Function calls are limited to auth.uid() and auth.jwt().",
      token.position,
    );
  }

  private parseAuthCall(): string {
    this.expectWord("auth");
    this.expectOp(".");
    const fn = this.peekWord();
    if (fn !== "uid" && fn !== "jwt") {
      throw new ParseError(
        "Function calls are limited to auth.uid() and auth.jwt().",
        this.pos(),
      );
    }
    this.idx += 1;
    this.expectOp("(");
    this.expectOp(")");
    let sql = `auth.${fn}()`;
    const arrow = this.peek();
    if (arrow?.kind === "op" && (arrow.value === "->>" || arrow.value === "->")) {
      if (fn !== "jwt") {
        throw new ParseError("Only auth.jwt() can use -> or ->>.", arrow.position);
      }
      this.idx += 1;
      const key = this.peek();
      if (!key || key.kind !== "string") {
        throw new ParseError("Expected a claim name string.", this.pos());
      }
      this.idx += 1;
      sql = `${sql} ${arrow.value} ${quoteLiteral(key.value)}`;
    }
    return sql;
  }

  private parseColumn(): string {
    const token = this.peek();
    if (!token || (token.kind !== "word" && token.kind !== "ident")) {
      throw new ParseError("Expected a column name.", this.pos());
    }
    if (token.kind === "word" && token.value.toLowerCase() === "auth") {
      throw new ParseError("Expected a column name.", token.position);
    }
    const first = token.kind === "word" ? token.value.toLowerCase() : token.value;
    if (!/^[a-z_][a-z0-9_]*$/.test(first)) {
      throw new ParseError("Column names must be simple identifiers.", token.position);
    }
    this.idx += 1;
    if (this.matchOp(".")) {
      const secondToken = this.peek();
      if (!secondToken || (secondToken.kind !== "word" && secondToken.kind !== "ident")) {
        throw new ParseError("Expected a column name.", this.pos());
      }
      const second =
        secondToken.kind === "word" ? secondToken.value.toLowerCase() : secondToken.value;
      if (!/^[a-z_][a-z0-9_]*$/.test(second)) {
        throw new ParseError("Column names must be simple identifiers.", secondToken.position);
      }
      this.idx += 1;
      if (this.peek()?.kind === "op" && this.peek()?.value === "(") {
        throw new ParseError(
          "Function calls are limited to auth.uid() and auth.jwt().",
          this.pos(),
        );
      }
      return `${first}.${second}`;
    }
    if (this.peek()?.kind === "op" && this.peek()?.value === "(") {
      throw new ParseError(
        "Function calls are limited to auth.uid() and auth.jwt().",
        this.pos(),
      );
    }
    return first;
  }

  private applyCast(sql: string): string {
    if (!this.matchOp("::")) return sql;
    const type = this.expectAnyWord(
      [...CAST_TYPES],
      "Casts are limited to uuid, text, and boolean.",
    );
    const inner = sql.startsWith("(") ? sql : `(${sql})`;
    return `${inner}::${type}`;
  }

  private guardDepth(depth: number) {
    if (depth > MAX_DEPTH) {
      throw new ParseError("Expression is too deeply nested.", this.pos());
    }
  }

  private done(): boolean {
    return this.idx >= this.tokens.length;
  }

  private peek(): Token | undefined {
    return this.tokens[this.idx];
  }

  private peekWord(): string | null {
    const token = this.peek();
    if (!token || token.kind !== "word") return null;
    return token.value.toLowerCase();
  }

  private pos(): number {
    return this.peek()?.position ?? (this.tokens.at(-1)?.position ?? 1);
  }

  private matchWord(word: string): boolean {
    if (this.peekWord() !== word) return false;
    this.idx += 1;
    return true;
  }

  private matchOp(op: string): boolean {
    const token = this.peek();
    if (!token || token.kind !== "op" || token.value !== op) return false;
    this.idx += 1;
    return true;
  }

  private expectWord(word: string) {
    if (!this.matchWord(word)) {
      throw new ParseError(`Expected ${word.toUpperCase()}.`, this.pos());
    }
  }

  private expectAnyWord(options: string[], detail: string): string {
    const word = this.peekWord();
    if (!word || !options.includes(word)) {
      throw new ParseError(detail, this.pos());
    }
    this.idx += 1;
    return word;
  }

  private expectOp(op: string) {
    if (!this.matchOp(op)) {
      throw new ParseError(`Expected "${op}".`, this.pos());
    }
  }
}
