from datetime import datetime, timezone


class StorageError(Exception):
    """Raised when a DigitalOcean Spaces (boto3) operation fails."""

    def __init__(self, key: str, error_type: str, detail: str = "") -> None:
        self.key = key
        self.error_type = error_type
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.detail = detail
        super().__init__(f"StorageError [{error_type}] on key '{key}': {detail}")
