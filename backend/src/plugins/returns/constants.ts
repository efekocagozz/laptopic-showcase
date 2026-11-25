/**
 * How long after the order was placed a return can be requested online. The legal withdrawal period is
 * 14 days after *delivery*; we don't record delivery dates, so we allow 30 days after ordering to cover
 * shipping time. Later requests can still be handled by customer service.
 */
export const RETURN_WINDOW_DAYS = 30;
export const MAX_RETURN_COMMENT_LENGTH = 1000;
export const loggerCtx = 'ReturnsPlugin';
