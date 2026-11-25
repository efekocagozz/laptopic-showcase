'use client';

import { createContext, useContext, ReactNode, useState } from 'react';
import { CheckoutOrder } from './types';
import type { PaymentOption } from '../payment-options';

interface CustomerAddress {
  id: string;
  fullName?: string | null;
  company?: string | null;
  streetLine1: string;
  streetLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country: { id: string; code: string; name: string };
  phoneNumber?: string | null;
  defaultShippingAddress?: boolean | null;
  defaultBillingAddress?: boolean | null;
}

interface Country {
  id: string;
  code: string;
  name: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  priceWithTax: number;
}

interface CheckoutContextType {
  order: CheckoutOrder;
  addresses: CustomerAddress[];
  countries: Country[];
  shippingMethods: ShippingMethod[];
  paymentOptions: PaymentOption[];
  selectedPaymentOption: PaymentOption | null;
  setSelectedPaymentOptionKey: (key: string | null) => void;
  isGuest: boolean;
}

const CheckoutContext = createContext<CheckoutContextType | null>(null);

interface CheckoutProviderProps {
  children: ReactNode;
  order: CheckoutOrder;
  addresses: CustomerAddress[];
  countries: Country[];
  shippingMethods: ShippingMethod[];
  paymentOptions: PaymentOption[];
  isGuest: boolean;
}

export function CheckoutProvider({
  children,
  order,
  addresses,
  countries,
  shippingMethods,
  paymentOptions,
  isGuest,
}: CheckoutProviderProps) {
  const [selectedPaymentOptionKey, setSelectedPaymentOptionKey] = useState<string | null>(
    paymentOptions.length === 1 ? paymentOptions[0].key : null
  );
  const selectedPaymentOption = paymentOptions.find((option) => option.key === selectedPaymentOptionKey) ?? null;

  return (
    <CheckoutContext.Provider
      value={{
        order,
        addresses,
        countries,
        shippingMethods,
        paymentOptions,
        selectedPaymentOption,
        setSelectedPaymentOptionKey,
        isGuest,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within CheckoutProvider');
  }
  return context;
}
