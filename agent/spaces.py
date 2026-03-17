"""Cloudflare R2 / S3-compatible storage helpers for the agent."""

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from agent.config import settings


def get_client():
    return boto3.client(
        "s3",
        region_name=settings.DO_SPACES_REGION or "auto",
        endpoint_url=settings.DO_SPACES_ENDPOINT,
        aws_access_key_id=settings.DO_SPACES_KEY,
        aws_secret_access_key=settings.DO_SPACES_SECRET,
    )


def upload_bytes(key: str, data: bytes) -> None:
    get_client().put_object(Bucket=settings.DO_SPACES_BUCKET, Key=key, Body=data)


def download_bytes(key: str) -> bytes:
    resp = get_client().get_object(Bucket=settings.DO_SPACES_BUCKET, Key=key)
    return resp["Body"].read()


def delete_object(key: str) -> None:
    get_client().delete_object(Bucket=settings.DO_SPACES_BUCKET, Key=key)
