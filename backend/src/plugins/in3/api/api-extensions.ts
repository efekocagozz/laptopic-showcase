import gql from 'graphql-tag';

export const shopApiExtensions = gql`
    """
    Whether in3 (pay in 3 interest-free installments) can be used, and an indication of each installment.
    """
    type In3Quote {
        eligible: Boolean!
        "Why in3 is not available: AMOUNT_TOO_LOW, AMOUNT_TOO_HIGH, CURRENCY_NOT_SUPPORTED or COUNTRY_NOT_SUPPORTED."
        reason: String
        installmentCount: Int!
        "Amount per installment, rounded up to whole cents."
        installmentAmount: Money!
    }

    extend type ProductVariant {
        in3Quote: In3Quote!
    }

    extend type Order {
        in3Quote: In3Quote!
    }
`;
