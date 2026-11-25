'use server';

import {mutate, query} from '@/platform/vendure/api';
import {SetOrderShippingAddressMutation, SetOrderBillingAddressMutation, SetOrderShippingMethodMutation, AddPaymentToOrderMutation, TransitionOrderToStateMutation, SetCustomerForOrderMutation, CreateMolliePaymentIntentMutation, GetActiveOrderForCheckoutQuery} from '@/features/checkout/graphql';
import {CreateCustomerAddressMutation} from '@/features/account/graphql';
import {revalidatePath, updateTag} from 'next/cache';
import {redirect} from '@/platform/i18n/navigation';
import {getLocale} from 'next-intl/server';
import {redirect as nextRedirect} from 'next/navigation';
import {z} from 'zod';
import {SITE_URL} from '@/config/metadata';
import {routing} from '@/platform/i18n/routing';
import {MOLLIE_PAYMENT_METHOD_CODE} from '@/features/checkout/payment-options';

interface AddressInput {
    fullName: string;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    province: string;
    postalCode: string;
    countryCode: string;
    phoneNumber: string;
    company?: string;
}

export async function setShippingAddress(
    shippingAddress: AddressInput,
    useSameForBilling: boolean
) {
    const shippingResult = await mutate(
        SetOrderShippingAddressMutation,
        {input: shippingAddress},
        {useAuthToken: true}
    );

    if (shippingResult.data.setOrderShippingAddress.__typename !== 'Order') {
        throw new Error('Failed to set shipping address');
    }

    if (useSameForBilling) {
        await mutate(
            SetOrderBillingAddressMutation,
            {input: shippingAddress},
            {useAuthToken: true}
        );
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

export async function setShippingMethod(shippingMethodId: string) {
    const result = await mutate(
        SetOrderShippingMethodMutation,
        {shippingMethodId: [shippingMethodId]},
        {useAuthToken: true}
    );

    if (result.data.setOrderShippingMethod.__typename !== 'Order') {
        throw new Error('Failed to set shipping method');
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

export async function createCustomerAddress(address: AddressInput) {
    const result = await mutate(
        CreateCustomerAddressMutation,
        {input: address},
        {useAuthToken: true}
    );

    if (!result.data.createCustomerAddress) {
        throw new Error('Failed to create customer address');
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
    return result.data.createCustomerAddress;
}

export async function transitionToArrangingPayment() {
    const result = await mutate(
        TransitionOrderToStateMutation,
        {state: 'ArrangingPayment'},
        {useAuthToken: true}
    );

    if (result.data.transitionOrderToState?.__typename === 'OrderStateTransitionError') {
        const errorResult = result.data.transitionOrderToState;
        throw new Error(
            `Failed to transition order state: ${errorResult.errorCode} - ${errorResult.message}`
        );
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

const placeOrderInput = z.object({
    paymentMethodCode: z.string().min(1).max(100),
    molliePaymentMethodCode: z.string().min(1).max(100).optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderInput>;

/**
 * Pays for the active order. Mollie payments redirect to Mollie's hosted checkout; the order is
 * completed by Mollie's webhook on the backend. Other methods (the dev-only test payment) are added directly.
 * Returns an error only when the payment could not be started; on success it redirects.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<{error: string} | void> {
    const parsed = placeOrderInput.safeParse(input);
    if (!parsed.success) {
        return {error: 'INVALID_INPUT'};
    }
    const {paymentMethodCode, molliePaymentMethodCode} = parsed.data;
    const locale = await getLocale();

    if (paymentMethodCode === MOLLIE_PAYMENT_METHOD_CODE) {
        const {data} = await query(GetActiveOrderForCheckoutQuery, {}, {useAuthToken: true});
        if (!data.activeOrder) {
            return {error: 'NO_ACTIVE_ORDER'};
        }
        let intent;
        try {
            const result = await mutate(
                CreateMolliePaymentIntentMutation,
                {
                    input: {
                        paymentMethodCode,
                        molliePaymentMethodCode,
                        // Where Mollie sends the customer back to. The plugin only appends the order code
                        // to its own fallback URL, so we include it here.
                        redirectUrl: `${SITE_URL}${locale === routing.defaultLocale ? '' : `/${locale}`}/order-confirmation/${data.activeOrder.code}`,
                        locale: toMollieLocale(locale),
                    },
                },
                {useAuthToken: true},
            );
            intent = result.data.createMolliePaymentIntent;
        } catch (error) {
            // The backend refuses in3 for ineligible orders (In3Plugin); anything else is e.g. Mollie unreachable.
            if (error instanceof Error && error.message.includes('in3 is not available')) {
                return {error: 'IN3_NOT_AVAILABLE'};
            }
            console.error('Could not create Mollie payment:', error);
            return {error: 'PAYMENT_PROVIDER_UNAVAILABLE'};
        }
        if (intent.__typename !== 'MolliePaymentIntent') {
            console.error(`Mollie payment intent failed: ${intent.errorCode} - ${intent.message}`);
            return {error: intent.errorCode};
        }
        // Once paid at Mollie the order stops being the active cart; don't serve the cached cart afterwards.
        updateTag('cart');
        updateTag('active-order');
        nextRedirect(intent.url);
    }

    await transitionToArrangingPayment();
    const result = await mutate(
        AddPaymentToOrderMutation,
        {input: {method: paymentMethodCode, metadata: {}}},
        {useAuthToken: true},
    );

    if (result.data.addPaymentToOrder.__typename !== 'Order') {
        const errorResult = result.data.addPaymentToOrder;
        console.error(`Failed to place order: ${errorResult.errorCode} - ${errorResult.message}`);
        return {error: errorResult.errorCode};
    }

    const orderCode = result.data.addPaymentToOrder.code;

    // Update the cart tag to immediately invalidate cached cart data
    updateTag('cart');
    updateTag('active-order');

    redirect({href: `/order-confirmation/${orderCode}`, locale});
}

function toMollieLocale(locale: string) {
    return locale === 'nl' ? 'nl_NL' : 'en_US';
}

interface GuestCustomerInput {
    emailAddress: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

export type SetCustomerForOrderResult =
    | { success: true }
    | { success: false; errorCode: 'EMAIL_CONFLICT'; message: string }
    | { success: false; errorCode: 'GUEST_CHECKOUT_DISABLED'; message: string }
    | { success: false; errorCode: 'NO_ACTIVE_ORDER'; message: string }
    | { success: false; errorCode: 'UNKNOWN'; message: string };

export async function setCustomerForOrder(
    input: GuestCustomerInput
): Promise<SetCustomerForOrderResult> {
    const result = await mutate(
        SetCustomerForOrderMutation,
        { input },
        { useAuthToken: true }
    );

    const response = result.data.setCustomerForOrder;

    switch (response.__typename) {
        case 'Order': {
            const locale = await getLocale();
            revalidatePath(`/${locale}/checkout`);
            return { success: true };
        }
        case 'AlreadyLoggedInError':
            return { success: true };
        case 'EmailAddressConflictError':
            return { success: false, errorCode: 'EMAIL_CONFLICT', message: response.message };
        case 'GuestCheckoutError':
            return { success: false, errorCode: 'GUEST_CHECKOUT_DISABLED', message: response.message };
        case 'NoActiveOrderError':
            return { success: false, errorCode: 'NO_ACTIVE_ORDER', message: response.message };
        default:
            return { success: false, errorCode: 'UNKNOWN', message: 'Unknown error' };
    }
}
