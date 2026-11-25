export type ReturnReason = 'WITHDRAWAL' | 'DEFECT' | 'WRONG_ITEM' | 'OTHER';

export interface ReturnRequestInput {
    orderCode: string;
    emailAddress: string;
    reason: ReturnReason;
    comment?: string | null;
}

export type ReturnRequestErrorCode = 'ORDER_NOT_FOUND' | 'NOT_RETURNABLE' | 'RETURN_PERIOD_EXPIRED' | 'INVALID_INPUT';

export type ReturnRequestResult =
    | { __typename: 'ReturnRequestReceived'; orderCode: string }
    | { __typename: 'ReturnRequestError'; errorCode: ReturnRequestErrorCode; message: string };
