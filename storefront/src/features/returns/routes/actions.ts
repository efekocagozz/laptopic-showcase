'use server';

import {mutate} from '@/platform/vendure/api';
import {RequestReturnMutation} from '../graphql';
import {returnRequestSchema, type ReturnRequestFormData, type ReturnRequestOutcome} from '../return-request';

export async function requestReturnAction(input: ReturnRequestFormData): Promise<ReturnRequestOutcome> {
    const parsed = returnRequestSchema.safeParse(input);
    if (!parsed.success) {
        return {success: false, errorCode: 'INVALID_INPUT'};
    }
    try {
        const {data} = await mutate(RequestReturnMutation, {
            input: {...parsed.data, comment: parsed.data.comment || null},
        });
        const result = data.requestReturn;
        if (result.__typename === 'ReturnRequestReceived') {
            return {success: true, orderCode: result.orderCode};
        }
        return {success: false, errorCode: result.errorCode};
    } catch (error) {
        console.error('Return request failed:', error);
        return {success: false, errorCode: 'UNKNOWN'};
    }
}
