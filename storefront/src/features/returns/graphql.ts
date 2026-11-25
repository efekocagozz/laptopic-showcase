import {graphql} from '@/platform/vendure/graphql';

export const RequestReturnMutation = graphql(`
    mutation RequestReturn($input: ReturnRequestInput!) {
        requestReturn(input: $input) {
            __typename
            ... on ReturnRequestReceived {
                orderCode
            }
            ... on ReturnRequestError {
                errorCode
                message
            }
        }
    }
`);
