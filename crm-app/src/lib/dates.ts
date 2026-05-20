/**
 * Helpers para fechas. Centralizado para evitar la inconsistencia DATE vs TIMESTAMP
 * que causaba que las métricas contaran mal en bordes de día.
 *
 * Regla del proyecto:
 *  - Columnas DATE (invoices.fecha, appointments.fecha, ...): comparar con 'YYYY-MM-DD'
 *  - Columnas TIMESTAMPTZ (patients.fecha_registro, ...): comparar con ISO completo
 */

/** Convierte un Date a string 'YYYY-MM-DD' (local time). */
export function toDateOnly(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Hoy en 'YYYY-MM-DD' (local time). */
export function todayDateOnly(): string {
    return toDateOnly(new Date());
}

/** Primer día del mes actual como Date. */
export function startOfThisMonth(now = new Date()): Date {
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Último día del mes actual como Date (23:59:59.999). */
export function endOfThisMonth(now = new Date()): Date {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Primer día del mes anterior. */
export function startOfLastMonth(now = new Date()): Date {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

/** Último día del mes anterior (23:59:59.999). */
export function endOfLastMonth(now = new Date()): Date {
    return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
}
