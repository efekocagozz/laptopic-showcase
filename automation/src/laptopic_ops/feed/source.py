"""Read the supplier export from a local file or an HTTP(S) URL."""

from pathlib import Path

import httpx

# A supplier export for a small catalogue is a few kilobytes; refuse anything absurd.
MAX_FEED_BYTES = 10 * 1024 * 1024
DOWNLOAD_TIMEOUT_SECONDS = 30.0


class FeedSourceError(RuntimeError):
    pass


def read_source(source: str, client: httpx.Client | None = None) -> str:
    if source.startswith(("http://", "https://")):
        if client is not None:
            return _download(source, client)
        with httpx.Client(timeout=DOWNLOAD_TIMEOUT_SECONDS) as own_client:
            return _download(source, own_client)
    path = Path(source)
    if not path.is_file():
        raise FeedSourceError(f"File not found: {path}")
    if path.stat().st_size > MAX_FEED_BYTES:
        raise FeedSourceError(f"{path} is larger than {MAX_FEED_BYTES} bytes")
    return _decode(path.read_bytes())


def _download(url: str, client: httpx.Client) -> str:
    try:
        with client.stream("GET", url, follow_redirects=True) as response:
            response.raise_for_status()
            body = bytearray()
            for chunk in response.iter_bytes():
                body.extend(chunk)
                if len(body) > MAX_FEED_BYTES:
                    raise FeedSourceError(f"Download from {url} is larger than {MAX_FEED_BYTES} bytes")
    except httpx.HTTPError as error:
        raise FeedSourceError(f"Could not download {url}: {error}") from error
    return _decode(bytes(body))


def _decode(data: bytes) -> str:
    # Spreadsheet exports are usually UTF-8 (often with a BOM); older Windows tools write cp1252.
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        return data.decode("cp1252")
