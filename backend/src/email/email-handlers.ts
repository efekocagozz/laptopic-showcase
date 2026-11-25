import {
    EntityHydrator,
    Injector,
    Order,
    OrderService,
    OrderStateTransitionEvent,
    RequestContext,
} from '@vendure/core';
import {
    defaultEmailHandlers,
    EmailEventHandler,
    EmailEventListener,
    orderConfirmationHandler,
} from '@vendure/email-plugin';

import { ReturnRequestedEvent } from '../plugins/returns/return-requested.event';
import { REASON_LABELS } from '../plugins/returns/return-request.service';
import { COMPANY } from './company';
import { groupVatByRate } from './vat-summary';

/** Dutch subjects for Vendure's built-in customer emails. The admin password reset stays English. */
const DUTCH_SUBJECTS: Record<string, string> = {
    'order-confirmation': 'Bedankt voor je bestelling {{ order.code }}',
    'email-verification': 'Bevestig je e-mailadres',
    'password-reset': 'Stel een nieuw wachtwoord in',
    'email-address-change': 'Bevestig je nieuwe e-mailadres',
};

const builtInHandlers = defaultEmailHandlers.map(handler => {
    const subject = DUTCH_SUBJECTS[handler.type];
    return subject ? handler.setSubject(subject) : handler;
});

// The order confirmation shows a VAT summary per rate. It is deliberately not an invoice: whether the shop uses
// the margin scheme for second-hand goods (which forbids showing VAT) is for the accountant to decide.
orderConfirmationHandler.setTemplateVars(event => ({
    order: event.order,
    shippingLines: event.data.shippingLines,
    vatSummary: groupVatByRate(event.order.taxSummary),
}));

/** Sent once all items of an order have been shipped, with the tracking codes. */
const orderShippedHandler = new EmailEventListener('order-shipped')
    .on(OrderStateTransitionEvent)
    .filter(event => event.toState === 'Shipped' && !!event.order.customer)
    .loadData(async ({ event, injector }) => ({
        trackingCodes: await getTrackingCodes(injector, event.ctx, event.order),
    }))
    .setRecipient(event => event.order.customer!.emailAddress)
    .setFrom('{{ fromAddress }}')
    .setSubject('Je bestelling {{ order.code }} is onderweg')
    .setTemplateVars(event => ({ order: event.order, trackingCodes: event.data.trackingCodes }));

/** Confirms a return request to the customer, with the shop in BCC so staff see it immediately. */
const returnRequestedHandler = new EmailEventListener('return-requested')
    .on(ReturnRequestedEvent)
    .loadData(async ({ event, injector }) => {
        const order = await injector.get(EntityHydrator).hydrate(event.ctx, event.order, { relations: ['customer'] });
        // Plain values only: email jobs are serialized, and Order getters need relations we don't load.
        return { emailAddress: order.customer!.emailAddress, firstName: order.customer!.firstName };
    })
    .setRecipient(event => event.data.emailAddress)
    .setOptionalAddressFields(() => ({ bcc: COMPANY.email }))
    .setFrom('{{ fromAddress }}')
    .setSubject('We hebben je retouraanvraag voor {{ orderCode }} ontvangen')
    .setTemplateVars(event => ({
        orderCode: event.order.code,
        firstName: event.data.firstName,
        reason: REASON_LABELS[event.reason],
        comment: event.comment,
    }));

export const emailHandlers: Array<EmailEventHandler<any, any>> = [
    ...builtInHandlers,
    orderShippedHandler,
    returnRequestedHandler,
];

async function getTrackingCodes(injector: Injector, ctx: RequestContext, order: Order) {
    const fulfillments = await injector.get(OrderService).getOrderFulfillments(ctx, order);
    return fulfillments.map(f => f.trackingCode).filter((code): code is string => !!code);
}
