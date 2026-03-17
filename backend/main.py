import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.exceptions import StorageError
from backend.routers.action_items import router as action_items_router
from backend.routers.auth import router as auth_router
from backend.routers.meetings import router as meetings_router
from backend.routers.workspaces import router as workspaces_router

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


app.include_router(auth_router, prefix="/api")
app.include_router(meetings_router, prefix="/api")
app.include_router(action_items_router, prefix="/api")
app.include_router(workspaces_router, prefix="/api")
