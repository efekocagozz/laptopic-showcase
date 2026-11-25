"""A small client for Vendure's Admin API (GraphQL over HTTP).

It logs in as an administrator and sends the token Vendure returns in the `vendure-auth-token` response
header as a bearer token (the backend allows both bearer and cookie tokens, see `authOptions` in
backend/src/vendure-config.ts). Only read queries are used: this tool never changes shop data.
"""

from collections.abc import Iterator
from datetime import datetime
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from laptopic_ops.vendure.models import ListResult, Order, OrderList, ProductVariant, ProductVariantList

AUTH_TOKEN_HEADER = "vendure-auth-token"
REQUEST_TIMEOUT_SECONDS = 30.0
# Vendure's default adminListQueryLimit is 1000; smaller pages keep responses fast.
PAGE_SIZE = 100

LOGIN_MUTATION = """
mutation Login($username: String!, $password: String!) {
  login(username: $username, password: $password) {
    __typename
    ... on ErrorResult { errorCode message }
  }
}
"""

ORDERS_QUERY = """
query PlacedOrders($options: OrderListOptions) {
  orders(options: $options) {
    totalItems
    items {
      code
      state
      orderPlacedAt
      totalWithTax
      currencyCode
      payments { method state amount metadata }
    }
  }
}
"""

VARIANTS_QUERY = """
query Variants($options: ProductVariantListOptions) {
  productVariants(options: $options) {
    totalItems
    items {
      sku
      name
      enabled
      stockLevels { stockOnHand stockAllocated }
    }
  }
}
"""


class VendureApiError(RuntimeError):
    pass


class _GraphQLError(BaseModel):
    message: str


class _GraphQLResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    # GraphQL "data" is an arbitrary JSON object whose shape depends on the query; each caller validates
    # its own part with a pydantic model, so Any is intended here.
    data: dict[str, Any] | None = None
    errors: list[_GraphQLError] = Field(default_factory=list)


class VendureAdminClient:
    def __init__(self, api_url: str, http: httpx.Client | None = None) -> None:
        self._api_url = api_url
        self._http = http or httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS)
        self._token: str | None = None

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "VendureAdminClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def login(self, username: str, password: str) -> None:
        response = self._post(LOGIN_MUTATION, {"username": username, "password": password})
        data = self._data(response)
        result = data.get("login") or {}
        if result.get("__typename") != "CurrentUser":
            raise VendureApiError(f"Login failed: {result.get('message', 'unknown error')}")
        token = response.headers.get(AUTH_TOKEN_HEADER)
        if not token:
            raise VendureApiError(
                f"Login succeeded but no {AUTH_TOKEN_HEADER} header was returned; "
                "is 'bearer' enabled in authOptions.tokenMethod?"
            )
        self._token = token

    def placed_orders_since(self, since: datetime) -> list[Order]:
        orders: list[Order] = []
        for page in self._pages(
            ORDERS_QUERY,
            "orders",
            {"filter": {"orderPlacedAt": {"after": since.isoformat()}}, "sort": {"orderPlacedAt": "ASC"}},
            OrderList,
        ):
            orders.extend(page.items)
        return orders

    def product_variants(self) -> list[ProductVariant]:
        variants: list[ProductVariant] = []
        for page in self._pages(
            VARIANTS_QUERY, "productVariants", {"sort": {"sku": "ASC"}}, ProductVariantList
        ):
            variants.extend(page.items)
        return variants

    def _pages[PageT: ListResult](
        self, query: str, field: str, options: dict[str, object], model: type[PageT]
    ) -> Iterator[PageT]:
        skip = 0
        while True:
            data = self._data(self._post(query, {"options": {**options, "skip": skip, "take": PAGE_SIZE}}))
            try:
                page = model.model_validate(data[field])
            except (KeyError, ValidationError) as error:
                raise VendureApiError(f"Unexpected response shape for {field}: {error}") from error
            yield page
            skip += PAGE_SIZE
            if skip >= page.total_items or not page.items:
                return

    def _post(self, query: str, variables: dict[str, object]) -> httpx.Response:
        headers = {"Authorization": f"Bearer {self._token}"} if self._token else {}
        try:
            response = self._http.post(
                self._api_url, json={"query": query, "variables": variables}, headers=headers
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise VendureApiError(f"Request to {self._api_url} failed: {error}") from error
        return response

    @staticmethod
    def _data(response: httpx.Response) -> dict[str, Any]:
        try:
            body = _GraphQLResponse.model_validate_json(response.content)
        except ValidationError as error:
            raise VendureApiError(f"Response is not a GraphQL result: {error}") from error
        if body.errors:
            raise VendureApiError("; ".join(error.message for error in body.errors))
        if body.data is None:
            raise VendureApiError("GraphQL response has no data")
        return body.data
