import {query} from '@/platform/vendure/api';
import {GetMolliePaymentMethodsQuery} from './graphql';
import type {In3QuoteView} from '@/features/pricing/in3-installments';

/** Must match MOLLIE_PAYMENT_METHOD_CODE in the backend (backend/src/seed/mollie-payment-method.ts). */
export const MOLLIE_PAYMENT_METHOD_CODE = 'mollie';
/** Mollie's code for in3. */
const MOLLIE_IN3_METHOD_CODE = 'in3';

/**
 * One choice in the payment step. A Vendure payment method can expand into several options:
 * the Mollie method becomes one option per Mollie method (iDEAL, in3, ...).
 */
export interface PaymentOption {
    /** Unique key for the UI, e.g. "mollie:ideal" or "testbetaling". */
    key: string;
    paymentMethodCode: string;
    /** Preselects this method in Mollie's hosted checkout. */
    molliePaymentMethodCode?: string;
    name: string;
    description?: string;
    imageUrl?: string;
    /** Set for the in3 option, to show the installment amount. */
    in3Quote?: In3QuoteView;
}

interface EligiblePaymentMethod {
    code: string;
    name: string;
    description?: string | null;
}

/**
 * @param in3Quote the backend's in3 quote for the order. in3 is left out when it isn't eligible; the backend
 *   also refuses in3 payments for ineligible orders, so this only keeps the customer from a dead end.
 */
export async function getPaymentOptions(
    eligibleMethods: EligiblePaymentMethod[],
    currencyCode: string,
    in3Quote: In3QuoteView,
): Promise<PaymentOption[]> {
    const options = await Promise.all(
        eligibleMethods.map(async (method): Promise<PaymentOption[]> => {
            const base = {
                key: method.code,
                paymentMethodCode: method.code,
                name: method.name,
                description: stripHtml(method.description),
            };
            if (method.code !== MOLLIE_PAYMENT_METHOD_CODE) return [base];

            const mollieMethods = await getMollieMethods(currencyCode);
            // Without Mollie's list (e.g. Mollie unreachable) the customer picks a method on Mollie's page.
            if (!mollieMethods.length) return [base];
            return mollieMethods
                .filter(mollie => mollie.code !== MOLLIE_IN3_METHOD_CODE || in3Quote.eligible)
                .map(mollie => ({
                    key: `${method.code}:${mollie.code}`,
                    paymentMethodCode: method.code,
                    molliePaymentMethodCode: mollie.code,
                    name: mollie.description ?? mollie.code,
                    imageUrl: mollie.image?.svg ?? undefined,
                    in3Quote: mollie.code === MOLLIE_IN3_METHOD_CODE ? in3Quote : undefined,
                }));
        }),
    );
    return options.flat();
}

async function getMollieMethods(currencyCode: string) {
    try {
        const result = await query(
            GetMolliePaymentMethodsQuery,
            {input: {paymentMethodCode: MOLLIE_PAYMENT_METHOD_CODE}},
            {useAuthToken: true, currencyCode},
        );
        return result.data.molliePaymentMethods;
    } catch (error) {
        console.error('Could not load Mollie payment methods:', error);
        return [];
    }
}

/** Payment method descriptions are rendered as text, never as HTML. */
function stripHtml(value?: string | null) {
    return value ? value.replace(/<[^>]*>/g, '').trim() || undefined : undefined;
}
