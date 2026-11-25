"""Settings from environment variables, checked once at startup. Never hardcode credentials."""

import os
from collections.abc import Mapping
from dataclasses import dataclass, field

DEFAULT_ADMIN_API_URL = "http://localhost:3000/admin-api"


class ConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class AdminApiSettings:
    api_url: str
    username: str
    password: str = field(repr=False)  # keep the password out of logs and tracebacks


def admin_api_settings(environ: Mapping[str, str] | None = None) -> AdminApiSettings:
    """Reads the same SUPERADMIN_* variables as backend/.env, plus VENDURE_ADMIN_API_URL."""
    env: Mapping[str, str] = os.environ if environ is None else environ
    missing = [name for name in ("SUPERADMIN_USERNAME", "SUPERADMIN_PASSWORD") if not env.get(name)]
    if missing:
        raise ConfigError(f"Set {' and '.join(missing)} (see automation/README.md)")
    api_url = env.get("VENDURE_ADMIN_API_URL", DEFAULT_ADMIN_API_URL)
    if not api_url.startswith(("http://", "https://")):
        raise ConfigError(f"VENDURE_ADMIN_API_URL must be an http(s) URL, got {api_url!r}")
    return AdminApiSettings(
        api_url=api_url, username=env["SUPERADMIN_USERNAME"], password=env["SUPERADMIN_PASSWORD"]
    )
