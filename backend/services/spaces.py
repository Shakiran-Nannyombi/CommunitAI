import logging

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from backend.config import settings
from backend.exceptions import StorageError

logger = logging.getLogger(__name__)


def get_spaces_client():
    return boto3.client(
        "s3",
        region_name=settings.DO_SPACES_REGION,
        endpoint_url=settings.DO_SPACES_ENDPOINT,
        aws_access_key_id=settings.DO_SPACES_KEY,
        aws_secret_access_key=settings.DO_SPACES_SECRET,
    )


def upload_file(key: str, data: bytes) -> None:
    try:
        client = get_spaces_client()
        client.put_object(
            Bucket=settings.DO_SPACES_BUCKET,
            Key=key,
            Body=data,
        )
    except (BotoCoreError, ClientError) as exc:
        error_type = type(exc).__name__
        logger.error("Storage upload failed: key=%s error_type=%s detail=%s", key, error_type, str(exc))
        raise StorageError(key=key, error_type=error_type, detail=str(exc)) from exc


def download_file(key: str) -> bytes:
    try:
        client = get_spaces_client()
        response = client.get_object(
            Bucket=settings.DO_SPACES_BUCKET,
            Key=key,
        )
        return response["Body"].read()
    except (BotoCoreError, ClientError) as exc:
        error_type = type(exc).__name__
        logger.error("Storage download failed: key=%s error_type=%s detail=%s", key, error_type, str(exc))
        raise StorageError(key=key, error_type=error_type, detail=str(exc)) from exc


def delete_file(key: str) -> None:
    try:
        client = get_spaces_client()
        client.delete_object(
            Bucket=settings.DO_SPACES_BUCKET,
            Key=key,
        )
    except (BotoCoreError, ClientError) as exc:
        error_type = type(exc).__name__
        logger.error("Storage delete failed: key=%s error_type=%s detail=%s", key, error_type, str(exc))
        raise StorageError(key=key, error_type=error_type, detail=str(exc)) from exc


def generate_presigned_url(key: str, expiry: int = 3600) -> str:
    try:
        client = get_spaces_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.DO_SPACES_BUCKET, "Key": key},
            ExpiresIn=expiry,
        )
    except (BotoCoreError, ClientError) as exc:
        error_type = type(exc).__name__
        logger.error("Storage presign failed: key=%s error_type=%s detail=%s", key, error_type, str(exc))
        raise StorageError(key=key, error_type=error_type, detail=str(exc)) from exc
