import gql from 'graphql-tag';

export const shopApiExtensions = gql`
    enum ReturnReason {
        "The customer uses their legal right of withdrawal (bedenktijd)."
        WITHDRAWAL
        DEFECT
        WRONG_ITEM
        OTHER
    }

    input ReturnRequestInput {
        orderCode: String!
        "Must match the email address on the order."
        emailAddress: String!
        reason: ReturnReason!
        comment: String
    }

    type ReturnRequestReceived {
        orderCode: String!
    }

    enum ReturnRequestErrorCode {
        ORDER_NOT_FOUND
        NOT_RETURNABLE
        RETURN_PERIOD_EXPIRED
        INVALID_INPUT
    }

    type ReturnRequestError {
        errorCode: ReturnRequestErrorCode!
        message: String!
    }

    union ReturnRequestResult = ReturnRequestReceived | ReturnRequestError

    extend type Mutation {
        "Records a return request on the order and emails a confirmation to the customer."
        requestReturn(input: ReturnRequestInput!): ReturnRequestResult!
    }
`;
