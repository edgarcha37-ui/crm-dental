/**
 * Supabase fake en memoria para tests de integración.
 *
 * Soporta el subconjunto de la API de supabase-js que usan las rutas del CRM:
 *   from(t).insert(obj).select().single()
 *   from(t).select(cols).eq(col, v).single()
 *   from(t).select(cols).eq(...).gte(...)
 *   from(t).select('id', { count: 'exact', head: true })
 *   from(t).update(obj).eq(col, v)
 *
 * No es un mock de red: guarda filas reales en Maps, con ids autoincrementales,
 * para poder probar flujos completos (paciente → cita → abono → stats).
 */

type Row = Record<string, unknown>;

interface QueryResult {
  data: unknown;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

class FakeQuery implements PromiseLike<QueryResult> {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row | null = null;
  private filters: Array<(r: Row) => boolean> = [];
  private wantSingle = false;
  private wantCount = false;
  private head = false;

  constructor(private db: FakeSupabase, private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    // Tras insert/update, select() solo indica "returning"; no cambia la operación.
    if (this.op === 'select') {
      if (opts?.count) this.wantCount = true;
      if (opts?.head) this.head = true;
    }
    return this;
  }

  insert(obj: Row | Row[]) {
    this.op = 'insert';
    this.payload = Array.isArray(obj) ? obj[0] : obj;
    return this;
  }

  update(obj: Row) {
    this.op = 'update';
    this.payload = obj;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push(r => r[col] === val);
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push(r => String(r[col]) >= String(val));
    return this;
  }

  lte(col: string, val: unknown) {
    this.filters.push(r => String(r[col]) <= String(val));
    return this;
  }

  order() { return this; }
  limit() { return this; }
  range() { return this; }

  single() {
    this.wantSingle = true;
    return this;
  }

  maybeSingle() {
    this.wantSingle = true;
    return this;
  }

  then<T1 = QueryResult, T2 = never>(
    onfulfilled?: ((value: QueryResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.exec()).then(onfulfilled, onrejected);
  }

  private exec(): QueryResult {
    const rows = this.db.rows(this.table);

    if (this.op === 'insert') {
      const row: Row = {
        id: this.db.nextId(this.table),
        created_at: new Date().toISOString(),
        ...this.payload,
      };
      rows.push(row);
      return this.wantSingle ? { data: row, error: null } : { data: [row], error: null };
    }

    if (this.op === 'update') {
      const matched = rows.filter(r => this.filters.every(f => f(r)));
      matched.forEach(r => Object.assign(r, this.payload));
      return { data: matched, error: null };
    }

    if (this.op === 'delete') {
      const keep = rows.filter(r => !this.filters.every(f => f(r)));
      this.db.setRows(this.table, keep);
      return { data: null, error: null };
    }

    // select
    const matched = rows.filter(r => this.filters.every(f => f(r)));
    if (this.wantCount) {
      return { data: this.head ? null : matched, error: null, count: matched.length };
    }
    if (this.wantSingle) {
      if (matched.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      }
      return { data: matched[0], error: null };
    }
    return { data: matched, error: null };
  }
}

export class FakeSupabase {
  private tables = new Map<string, Row[]>();
  private ids = new Map<string, number>();

  from(table: string) {
    return new FakeQuery(this, table);
  }

  rows(table: string): Row[] {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  setRows(table: string, rows: Row[]) {
    this.tables.set(table, rows);
  }

  nextId(table: string): number {
    const next = (this.ids.get(table) ?? 0) + 1;
    this.ids.set(table, next);
    return next;
  }

  reset() {
    this.tables.clear();
    this.ids.clear();
  }
}
