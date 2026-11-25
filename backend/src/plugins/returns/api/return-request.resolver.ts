import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Transaction } from '@vendure/core';

import { ReturnRequestService } from '../return-request.service';
import { ReturnRequestInput, ReturnRequestResult } from '../types';

@Resolver()
export class ReturnRequestResolver {
    constructor(private returnRequestService: ReturnRequestService) {}

    @Transaction()
    @Mutation()
    requestReturn(@Ctx() ctx: RequestContext, @Args() args: { input: ReturnRequestInput }): Promise<ReturnRequestResult> {
        return this.returnRequestService.requestReturn(ctx, args.input);
    }
}
