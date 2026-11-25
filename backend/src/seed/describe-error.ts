/**
 * Turns a failure in the seed/setup scripts into a readable message. Connection failures arrive as an
 * AggregateError with an empty message, which would otherwise print as a blank error line.
 */
export function describeError(err: unknown): string {
    const { code, errors } = (err ?? {}) as { code?: string; errors?: unknown[] };
    if (code === 'ECONNREFUSED') {
        return 'Cannot connect to the database. Is Postgres running? Start it with `npm run db:up` (and make sure Docker is running).';
    }
    const message = err instanceof Error ? err.message : String(err);
    if (!message && Array.isArray(errors)) {
        return errors.map(inner => (inner instanceof Error ? inner.message : String(inner))).join('; ');
    }
    return message;
}
