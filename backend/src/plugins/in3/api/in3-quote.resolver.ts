import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Ctx, Order, ProductVariant, RequestContext } from '@vendure/core';

import { In3EligibilityService } from '../in3-eligibility.service';
import { In3Quote } from '../in3-quote';

@Resolver('ProductVariant')
export class ProductVariantIn3Resolver {
    constructor(private in3EligibilityService: In3EligibilityService) {}

    @ResolveField()
    in3Quote(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<In3Quote> {
        return this.in3EligibilityService.quoteForVariant(ctx, variant);
    }
}

@Resolver('Order')
export class OrderIn3Resolver {
    constructor(private in3EligibilityService: In3EligibilityService) {}

    @ResolveField()
    in3Quote(@Parent() order: Order): In3Quote {
        return this.in3EligibilityService.quoteForOrder(order);
    }
}
