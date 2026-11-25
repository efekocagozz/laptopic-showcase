'use client';

import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { useCheckout } from '../checkout-provider';
import {useTranslations} from 'next-intl';
import {In3Installments} from '@/features/pricing/in3-installments';

interface PaymentStepProps {
  onComplete: () => void;
}

export default function PaymentStep({ onComplete }: PaymentStepProps) {
  const t = useTranslations('Checkout');
  const { order, paymentOptions, selectedPaymentOption, setSelectedPaymentOptionKey } = useCheckout();

  const handleContinue = () => {
    if (!selectedPaymentOption) return;
    onComplete();
  };

  if (paymentOptions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('noPaymentMethods')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="font-semibold">{t('selectPaymentMethod')}</h3>

      <RadioGroup value={selectedPaymentOption?.key || ''} onValueChange={setSelectedPaymentOptionKey}>
        {paymentOptions.map((option) => (
          <Label key={option.key} htmlFor={option.key} className="cursor-pointer">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <RadioGroupItem value={option.key} id={option.key} />
                {option.imageUrl ? (
                  // Mollie's payment method logos are external SVGs; next/image adds nothing for these.
                  <img src={option.imageUrl} alt="" className="h-6 w-8 object-contain" />
                ) : (
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{option.name}</p>
                  {option.description && (
                    <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                  )}
                  {option.in3Quote && (
                    <In3Installments quote={option.in3Quote} currencyCode={order.currencyCode} className="mt-1 text-muted-foreground" />
                  )}
                </div>
              </div>
            </Card>
          </Label>
        ))}
      </RadioGroup>

      <Button
        onClick={handleContinue}
        disabled={!selectedPaymentOption}
        className="w-full"
      >
        {t('continueToReview')}
      </Button>
    </div>
  );
}
