import {z} from 'zod';

export const RETURN_REASONS = ['WITHDRAWAL', 'DEFECT', 'WRONG_ITEM', 'OTHER'] as const;
/** Must match MAX_RETURN_COMMENT_LENGTH in the backend's returns plugin. */
export const MAX_RETURN_COMMENT_LENGTH = 1000;

/** Shared by the form (client) and the server action, which validates again: never trust the browser. */
export const returnRequestSchema = z.object({
    orderCode: z.string().trim().min(1).max(32),
    emailAddress: z.email(),
    reason: z.enum(RETURN_REASONS),
    comment: z.string().trim().max(MAX_RETURN_COMMENT_LENGTH).optional(),
});

export type ReturnRequestFormData = z.infer<typeof returnRequestSchema>;

export type ReturnRequestErrorCode = 'ORDER_NOT_FOUND' | 'NOT_RETURNABLE' | 'RETURN_PERIOD_EXPIRED' | 'INVALID_INPUT' | 'UNKNOWN';

export type ReturnRequestOutcome =
    | {success: true; orderCode: string}
    | {success: false; errorCode: ReturnRequestErrorCode};
