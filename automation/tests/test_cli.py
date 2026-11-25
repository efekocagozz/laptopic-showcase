from pathlib import Path

import httpx
import pytest
import respx

from laptopic_ops.cli import EXIT_ATTENTION, EXIT_FAILED, EXIT_OK, main
from laptopic_ops.config import AdminApiSettings, ConfigError, admin_api_settings
from laptopic_ops.vendure.client import AUTH_TOKEN_HEADER

HEADER = "Artikelnummer;Omschrijving;Voorraad;Adviesprijs excl. BTW"
API_URL = "http://vendure.test/admin-api"


def _export(tmp_path: Path, rows: str) -> Path:
    path = tmp_path / "export.csv"
    path.write_text(f"{HEADER}\n{rows}", encoding="utf-8")
    return path


def test_feed_writes_import_file(tmp_path: Path) -> None:
    output = tmp_path / "supplier.csv"
    code = main(
        ["feed", "--input", str(_export(tmp_path, "SKU-1;Laptop;3;100,00\n")), "--output", str(output)]
    )

    assert code == EXIT_OK
    assert output.read_text() == "sku,stock,price\nSKU-1,3,121.00\n"


def test_feed_with_rejected_rows_writes_valid_rows_and_asks_for_attention(tmp_path: Path) -> None:
    output, rejects = tmp_path / "supplier.csv", tmp_path / "rejects.csv"
    source = _export(tmp_path, "SKU-1;Laptop;3;100,00\n;Nameless;1;1,00\n")

    code = main(["feed", "--input", str(source), "--output", str(output), "--rejects", str(rejects)])

    assert code == EXIT_ATTENTION
    assert output.read_text() == "sku,stock,price\nSKU-1,3,121.00\n"
    assert rejects.read_text() == "line,message\n3,Missing SKU\n"


def test_feed_without_valid_rows_keeps_the_previous_file(tmp_path: Path) -> None:
    output = tmp_path / "supplier.csv"
    output.write_text("sku,stock,price\nOLD,1,1.00\n")

    code = main(["feed", "--input", str(_export(tmp_path, ";Nameless;1;1,00\n")), "--output", str(output)])

    assert code == EXIT_FAILED
    assert output.read_text() == "sku,stock,price\nOLD,1,1.00\n"


def test_feed_with_missing_columns_fails(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    source = tmp_path / "export.csv"
    source.write_text("sku;stock\nA;1\n")

    assert main(["feed", "--input", str(source), "--output", str(tmp_path / "out.csv")]) == EXIT_FAILED
    assert "Missing column(s)" in capsys.readouterr().err
    assert not (tmp_path / "out.csv").exists()


def test_report_requires_credentials(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.delenv("SUPERADMIN_USERNAME", raising=False)
    monkeypatch.delenv("SUPERADMIN_PASSWORD", raising=False)

    assert main(["report"]) == EXIT_FAILED
    assert "SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD" in capsys.readouterr().err


@respx.mock
def test_report_end_to_end_against_mocked_api(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("VENDURE_ADMIN_API_URL", API_URL)
    monkeypatch.setenv("SUPERADMIN_USERNAME", "superadmin")
    monkeypatch.setenv("SUPERADMIN_PASSWORD", "pw")
    respx.post(API_URL).side_effect = [
        httpx.Response(
            200, json={"data": {"login": {"__typename": "CurrentUser"}}}, headers={AUTH_TOKEN_HEADER: "t"}
        ),
        httpx.Response(200, json={"data": {"orders": {"totalItems": 0, "items": []}}}),
        httpx.Response(
            200,
            json={
                "data": {
                    "productVariants": {
                        "totalItems": 1,
                        "items": [
                            {
                                "sku": "DL-7420-16-512",
                                "name": "Latitude 7420",
                                "enabled": True,
                                "stockLevels": [{"stockOnHand": 0, "stockAllocated": 0}],
                            }
                        ],
                    }
                }
            },
        ),
    ]
    output = tmp_path / "report.md"

    assert main(["report", "--output", str(output)]) == EXIT_ATTENTION
    assert "- DL-7420-16-512 (Latitude 7420): 0" in output.read_text()


def test_report_rejects_invalid_arguments() -> None:
    with pytest.raises(SystemExit):
        main(["report", "--hours", "0"])


def test_settings_read_environment_and_hide_password() -> None:
    settings = admin_api_settings({"SUPERADMIN_USERNAME": "admin", "SUPERADMIN_PASSWORD": "hunter2"})

    assert settings == AdminApiSettings("http://localhost:3000/admin-api", "admin", "hunter2")
    assert "hunter2" not in repr(settings)


def test_settings_reject_non_http_url() -> None:
    with pytest.raises(ConfigError, match="http"):
        admin_api_settings(
            {"SUPERADMIN_USERNAME": "a", "SUPERADMIN_PASSWORD": "b", "VENDURE_ADMIN_API_URL": "file:///etc"}
        )
