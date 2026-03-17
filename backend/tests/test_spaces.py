# Feature: communit-ai, Property 16: Storage round-trip
"""
Property 16: Storage round-trip

For any file (audio, transcript, summary, or sentiment report) written to
DigitalOcean Spaces, the file should be retrievable by its key and its
content should be byte-for-byte identical to what was written.

Validates: Requirements 9.1, 9.2
"""

from unittest.mock import MagicMock, patch

from hypothesis import given, settings
from hypothesis import strategies as st

from backend.services.spaces import download_file, upload_file

# ---------------------------------------------------------------------------
# In-memory mock S3 client
# ---------------------------------------------------------------------------


def make_mock_s3_client(store: dict):
    """Return a mock boto3 S3 client that stores objects in *store* (a dict)."""
    mock_client = MagicMock()

    def put_object(Bucket, Key, Body):  # noqa: N803
        store[Key] = Body if isinstance(Body, bytes) else Body

    def get_object(Bucket, Key):  # noqa: N803
        data = store[Key]
        body_mock = MagicMock()
        body_mock.read.return_value = data
        return {"Body": body_mock}

    mock_client.put_object.side_effect = put_object
    mock_client.get_object.side_effect = get_object
    return mock_client


# ---------------------------------------------------------------------------
# Hypothesis strategies
# ---------------------------------------------------------------------------

# Generate valid S3-style keys (non-empty, no leading slash)
key_strategy = st.from_regex(
    r"[a-zA-Z0-9_\-]{1,32}/[a-zA-Z0-9_\-]{1,64}\.[a-z]{2,4}",
    fullmatch=True,
)

# Generate arbitrary byte payloads (0 – 4 KB)
payload_strategy = st.binary(min_size=0, max_size=4096)


# ---------------------------------------------------------------------------
# Property 16: Storage round-trip
# Validates: Requirements 9.1, 9.2
# ---------------------------------------------------------------------------


@given(key=key_strategy, payload=payload_strategy)
@settings(max_examples=100)
def test_storage_round_trip(key: str, payload: bytes):
    """
    **Validates: Requirements 9.1, 9.2**

    For any (key, payload) pair, uploading *payload* under *key* and then
    downloading it must return bytes that are byte-for-byte identical to the
    original payload.
    """
    store: dict = {}
    mock_client = make_mock_s3_client(store)

    with patch("backend.services.spaces.get_spaces_client", return_value=mock_client):
        upload_file(key, payload)
        result = download_file(key)

    assert result == payload, (
        f"Round-trip mismatch for key={key!r}: "
        f"uploaded {len(payload)} bytes, got back {len(result)} bytes"
    )
