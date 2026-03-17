import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.exceptions import StorageError

logger = logging.getLogger(__name__)

app = FastAPI(title="CommunitAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StorageError)
async def storage_error_handler(request: Request, exc: StorageError) -> JSONResponse:
    logger.error(
        "StorageError: key=%s error_type=%s timestamp=%s detail=%s",
        exc.key,
        exc.error_type,
        exc.timestamp,
        exc.detail,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "storage_write_failed",
            "detail": exc.detail or str(exc),
        },
    )


# Routers will be registered here in task 4.1
# app.include_router(meetings_router)
# app.include_router(action_items_router)
