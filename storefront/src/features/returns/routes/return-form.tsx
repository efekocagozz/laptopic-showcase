'use client';

import {useState, useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useTranslations} from 'next-intl';
import {CheckCircle2, Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {Field, FieldError, FieldLabel} from '@/components/ui/field';
import {requestReturnAction} from './actions';
import {
    RETURN_REASONS,
    returnRequestSchema,
    type ReturnRequestErrorCode,
    type ReturnRequestFormData,
} from '../return-request';

export function ReturnForm() {
    const t = useTranslations('Returns');
    const [isPending, startTransition] = useTransition();
    const [errorCode, setErrorCode] = useState<ReturnRequestErrorCode | null>(null);
    const [receivedOrderCode, setReceivedOrderCode] = useState<string | null>(null);
    const {register, handleSubmit, formState: {errors}} = useForm<ReturnRequestFormData>({
        resolver: zodResolver(returnRequestSchema),
        defaultValues: {orderCode: '', emailAddress: '', reason: 'WITHDRAWAL', comment: ''},
    });

    const onSubmit = (data: ReturnRequestFormData) => {
        setErrorCode(null);
        startTransition(async () => {
            const outcome = await requestReturnAction(data);
            if (outcome.success) {
                setReceivedOrderCode(outcome.orderCode);
            } else {
                setErrorCode(outcome.errorCode);
            }
        });
    };

    if (receivedOrderCode) {
        return (
            <div role="status" className="rounded-xl border bg-card p-6 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
                <h2 className="text-xl font-bold">{t('successTitle')}</h2>
                <p className="text-muted-foreground">{t('success', {code: receivedOrderCode})}</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Field>
                <FieldLabel htmlFor="orderCode">{t('orderCode')}</FieldLabel>
                <Input id="orderCode" autoComplete="off" aria-invalid={!!errors.orderCode} {...register('orderCode')} />
                <FieldError>{errors.orderCode && t('orderCodeRequired')}</FieldError>
            </Field>
            <Field>
                <FieldLabel htmlFor="emailAddress">{t('emailAddress')}</FieldLabel>
                <Input id="emailAddress" type="email" autoComplete="email" aria-invalid={!!errors.emailAddress} {...register('emailAddress')} />
                <FieldError>{errors.emailAddress && t('invalidEmail')}</FieldError>
            </Field>
            <Field>
                <FieldLabel htmlFor="reason">{t('reason')}</FieldLabel>
                <NativeSelect id="reason" className="w-full" {...register('reason')}>
                    {RETURN_REASONS.map(reason => (
                        <NativeSelectOption key={reason} value={reason}>{t(`reasons.${reason}`)}</NativeSelectOption>
                    ))}
                </NativeSelect>
            </Field>
            <Field>
                <FieldLabel htmlFor="comment">{t('comment')}</FieldLabel>
                <Textarea id="comment" rows={4} aria-invalid={!!errors.comment} {...register('comment')} />
                <FieldError>{errors.comment && t('commentTooLong')}</FieldError>
            </Field>

            {errorCode && (
                <p role="alert" className="text-sm text-destructive">{t(`errors.${errorCode}`)}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? t('submitting') : t('submit')}
            </Button>
        </form>
    );
}
