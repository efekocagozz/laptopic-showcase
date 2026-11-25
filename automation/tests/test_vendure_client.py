"""The Admin API client against a mocked Vendure server (respx). No real network calls."""

import json
from datetime import UTC, datetime

import httpx
import pytest
import respx

from laptopic_ops.vendure.client import AUTH_TOKEN_HEADER, PAGE_SIZE, VendureAdminClient, VendureApiError

API_URL = "http://vendure.test/admin-api"


def _body(request: httpx.Request) -> dict[str, object]:
    body: dict[str, object] = json.loads(request.content)
    return body


def _login_ok() -> httpx.Response:
    return httpx.Response(
        200,
        json={"data": {"login": {"__typename": "CurrentUser"}}},
        headers={AUTH_TOKEN_HEADER: "secret-token"},
    )


def _order_json(code: str) -> dict[str, object]:
    return {
        "code": code,
        "state": "PaymentSettled",
        "orderPlacedAt": "2026-11-24T12:00:00.000Z",
        "totalWithTax": 66900,
        "currencyCode": "EUR",
        "payments": [
            {"method": "mollie", "state": "Settled", "amount": 66900, "metadata": {"method": "in3"}}
        ],
    }


@respx.mock
def test_login_then_sends_bearer_token() -> None:
    route = respx.post(API_URL)
    route.side_effect = [
        _login_ok(),
        httpx.Response(200, json={"data": {"productVariants": {"totalItems": 0, "items": []}}}),
    ]
    with VendureAdminClient(API_URL) as client:
        client.login("superadmin", "pw")
        assert client.product_variants() == []

    login_request, query_request = (call.request for call in route.calls)
    assert "Authorization" not in login_request.headers
    assert _body(login_request)["variables"] == {"username": "superadmin", "password": "pw"}
    assert query_request.headers["Authorization"] == "Bearer secret-token"


@respx.mock
def test_login_with_wrong_password_raises() -> None:
    respx.post(API_URL).respond(
        200,
        json={
            "data": {
                "login": {
                    "__typename": "InvalidCredentialsError",
                    "errorCode": "INVALID_CREDENTIALS_ERROR",
                    "message": "The provided credentials are invalid",
                }
            }
        },
    )
    with (
        VendureAdminClient(API_URL) as client,
        pytest.raises(VendureApiError, match="credentials are invalid"),
    ):
        client.login("superadmin", "wrong")


@respx.mock
def test_login_without_token_header_explains_the_config() -> None:
    respx.post(API_URL).respond(200, json={"data": {"login": {"__typename": "CurrentUser"}}})
    with VendureAdminClient(API_URL) as client, pytest.raises(VendureApiError, match="tokenMethod"):
        client.login("superadmin", "pw")


@respx.mock
def test_orders_are_paged_and_filtered_by_placed_date() -> None:
    first_page = [_order_json(f"A{i}") for i in range(PAGE_SIZE)]
    route = respx.post(API_URL)
    route.side_effect = [
        _login_ok(),
        httpx.Response(200, json={"data": {"orders": {"totalItems": PAGE_SIZE + 1, "items": first_page}}}),
        httpx.Response(
            200, json={"data": {"orders": {"totalItems": PAGE_SIZE + 1, "items": [_order_json("LAST")]}}}
        ),
    ]
    since = datetime(2026, 11, 24, 3, 0, tzinfo=UTC)
    with VendureAdminClient(API_URL) as client:
        client.login("superadmin", "pw")
        orders = client.placed_orders_since(since)

    assert len(orders) == PAGE_SIZE + 1
    assert orders[-1].code == "LAST"
    assert orders[-1].payments[0].metadata is not None
    assert orders[-1].payments[0].metadata.method == "in3"
    options = [_body(call.request)["variables"]["options"] for call in route.calls[1:]]  # type: ignore[index]
    assert [(page["skip"], page["take"]) for page in options] == [(0, PAGE_SIZE), (PAGE_SIZE, PAGE_SIZE)]
    assert options[0]["filter"] == {"orderPlacedAt": {"after": "2026-11-24T03:00:00+00:00"}}


@respx.mock
def test_graphql_errors_are_raised() -> None:
    respx.post(API_URL).respond(200, json={"errors": [{"message": "You are not currently authorized"}]})
    with (
        VendureAdminClient(API_URL) as client,
        pytest.raises(VendureApiError, match="not currently authorized"),
    ):
        client.product_variants()


@respx.mock
def test_http_errors_are_raised() -> None:
    respx.post(API_URL).respond(502)
    with VendureAdminClient(API_URL) as client, pytest.raises(VendureApiError, match="502"):
        client.login("superadmin", "pw")


@respx.mock
def test_unexpected_response_shape_is_raised() -> None:
    respx.post(API_URL).respond(200, json={"data": {"productVariants": {"items": "nope"}}})
    with VendureAdminClient(API_URL) as client, pytest.raises(VendureApiError, match="Unexpected response"):
        client.product_variants()
