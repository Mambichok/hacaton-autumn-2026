import base64
import hashlib
import hmac
import json
import logging
import math
import os
import re
import secrets
import sqlite3
import threading
import time
import unicodedata
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from langchain_qdrant import QdrantVectorStore
from pydantic import BaseModel, Field
from qdrant_client import QdrantClient

from ask_bot import ask_bot, check_spelling, review_draft
from index_documents import (
    COLLECTION_NAME,
    QDRANT_URL,
    create_splitter,
    extract_reference,
    extract_version,
    get_embeddings,
    read_docx_bytes,
    read_pdf_bytes,
)

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

APP_DIR = Path(__file__).resolve().parent
ORIGINAL_DIR = Path(
    os.getenv("DOCUMENTS_ORIGINAL_DIR", str(APP_DIR / "documents" / "original"))
)
UPLOAD_DIR = Path(
    os.getenv("DOCUMENTS_UPLOAD_DIR", str(APP_DIR / "documents" / "uploaded"))
)
ADMIN_DATABASE = Path(
    os.getenv("ADMIN_DATABASE_PATH", str(APP_DIR / "documents" / "admins.sqlite3"))
)
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE_MB", "20")) * 1024 * 1024
ALLOWED_EXTENSIONS = {".docx", ".pdf"}
SESSION_COOKIE = "assistant_session"
SESSION_DURATION_SECONDS = 8 * 60 * 60
SENSITIVE_DATA_PATTERNS = (
    ("email", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)),
    (
        "телефон",
        re.compile(
            r"(?<!\d)(?:\+7|8)[\s(.-]*\d{3}[\s).-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?!\d)"
        ),
    ),
    ("СНИЛС", re.compile(r"(?<!\d)\d{3}[- ]?\d{3}[- ]?\d{3}[- ]?\d{2}(?!\d)")),
    ("ИНН", re.compile(r"(?<!\d)\d{10}(?:\d{2})?(?!\d)")),
    (
        "паспортные данные",
        re.compile(r"паспорт.{0,20}\b\d{2}\s?\d{2}\s?\d{6}\b", re.IGNORECASE),
    ),
)

app = FastAPI(title="Document Assistant")


class InMemoryRateLimiter:
    def __init__(self):
        self._buckets: dict[tuple[str, str], tuple[float, int]] = {}
        self._lock = threading.Lock()

    def check(self, scope: str, identity: str, limit: int, window_seconds: int) -> int:
        now = time.monotonic()
        key = (scope, identity)
        with self._lock:
            expired = [
                bucket_key
                for bucket_key, (started_at, _) in self._buckets.items()
                if now - started_at >= window_seconds
            ]
            for bucket_key in expired:
                del self._buckets[bucket_key]

            started_at, count = self._buckets.get(key, (now, 0))
            if count >= limit:
                return max(1, math.ceil(window_seconds - (now - started_at)))
            if len(self._buckets) >= 10_000 and key not in self._buckets:
                oldest_key = min(self._buckets, key=lambda item: self._buckets[item][0])
                del self._buckets[oldest_key]
            self._buckets[key] = (started_at, count + 1)
            return 0


rate_limiter = InMemoryRateLimiter()


def _request_identity(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _enforce_rate_limit(
    request: Request, scope: str, limit: int, window_seconds: int
) -> None:
    retry_after = rate_limiter.check(
        scope, _request_identity(request), limit, window_seconds
    )
    if retry_after:
        raise HTTPException(
            status_code=429,
            detail="Слишком много запросов. Подождите и попробуйте снова.",
            headers={"Retry-After": str(retry_after)},
        )


def _find_sensitive_data(text: str) -> list[str]:
    return [name for name, pattern in SENSITIVE_DATA_PATTERNS if pattern.search(text)]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=1200)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=6)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)


class AdminCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9._@-]+$")
    password: str = Field(min_length=14, max_length=256)


def _connect_admin_database() -> sqlite3.Connection:
    ADMIN_DATABASE.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(ADMIN_DATABASE, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute(
        """CREATE TABLE IF NOT EXISTS admins (
            username TEXT PRIMARY KEY COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL
        )"""
    )
    return connection


@contextmanager
def _admin_database():
    connection = _connect_admin_database()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def _session_secret() -> bytes:
    secret = os.getenv("ADMIN_SESSION_SECRET", "")
    if len(secret) < 32:
        raise HTTPException(
            status_code=503,
            detail="Задайте ADMIN_SESSION_SECRET длиной не менее 32 символов в .env.",
        )
    return secret.encode("utf-8")


def _admin_password_hash(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**15,
        r=8,
        p=1,
        dklen=32,
        maxmem=64 * 1024 * 1024,
    )
    return f"{salt.hex()}:{digest.hex()}"


def _verify_admin_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest_hex = stored_hash.split(":", 1)
        expected = bytes.fromhex(digest_hex)
        actual_hash = _admin_password_hash(password, bytes.fromhex(salt_hex))
        actual = bytes.fromhex(actual_hash.split(":", 1)[1])
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


def _issue_session(username: str, role: str) -> str:
    payload = {
        "sub": username,
        "role": role,
        "exp": int(datetime.now(timezone.utc).timestamp()) + SESSION_DURATION_SECONDS,
    }
    encoded = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).rstrip(b"=")
    signature = hmac.new(_session_secret(), encoded, hashlib.sha256).digest()
    return (encoded + b"." + base64.urlsafe_b64encode(signature).rstrip(b"=")).decode("ascii")


def _current_user(request: Request) -> dict[str, str]:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Требуется вход администратора.")
    try:
        encoded, signature = token.encode("ascii").split(b".", 1)
        expected = hmac.new(_session_secret(), encoded, hashlib.sha256).digest()
        supplied = base64.urlsafe_b64decode(signature + b"=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, supplied):
            raise ValueError("Invalid signature")
        payload_bytes = base64.urlsafe_b64decode(encoded + b"=" * (-len(encoded) % 4))
        payload = json.loads(payload_bytes)
        if payload["exp"] <= int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("Expired session")
        if payload["role"] not in {"superadmin", "admin"}:
            raise ValueError("Invalid role")
        if payload["role"] == "admin":
            with _admin_database() as connection:
                active_admin = connection.execute(
                    "SELECT 1 FROM admins WHERE username = ?",
                    (payload["sub"],),
                ).fetchone()
            if not active_admin:
                raise ValueError("Admin account no longer exists")
        return {"username": payload["sub"], "role": payload["role"]}
    except (ValueError, KeyError, TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise HTTPException(status_code=401, detail="Сессия истекла или недействительна.") from None


def _require_superadmin(request: Request) -> dict[str, str]:
    user = _current_user(request)
    if user["role"] != "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Управлять администраторами может только супер-администратор.",
        )
    return user


def _source_file(filename: str) -> Path:
    if not _is_safe_document_filename(filename):
        raise HTTPException(status_code=400, detail="Некорректное имя файла.")
    for directory in (ORIGINAL_DIR, UPLOAD_DIR):
        candidate = directory / filename
        if candidate.is_file():
            return candidate
    raise HTTPException(status_code=404, detail="Документ не найден.")


def _is_safe_document_filename(filename: str) -> bool:
    path = Path(filename)
    if (
        not filename
        or path.name != filename
        or path.suffix.lower() not in ALLOWED_EXTENSIONS
        or filename.rstrip(" .") != filename
        or re.fullmatch(r"(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])", path.stem, flags=re.IGNORECASE)
    ):
        return False
    return all(
        char in "_ .()-" or unicodedata.category(char)[0] in {"L", "N", "M"}
        for char in filename
    )


@app.post("/api/chat")
def chat(request: ChatRequest, http_request: Request):
    _enforce_rate_limit(http_request, "chat", limit=20, window_seconds=60)
    sensitive_fields = _find_sensitive_data(
        "\n".join(
            [request.question, *(item.content for item in request.history)]
        )
    )
    if sensitive_fields:
        detected = ", ".join(sensitive_fields)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Обнаружены возможные персональные данные ({detected}). "
                "Запрос не передан AI-сервису. Удалите эти данные и повторите попытку; "
                "если они уже есть в истории диалога, начните новый диалог."
            ),
        )
    try:
        return ask_bot(
            request.question,
            [{"role": item.role, "content": item.content} for item in request.history],
        )
    except Exception as exc:
        logger.exception("Chat request failed")
        raise HTTPException(
            status_code=502,
            detail="Не удалось получить ответ от базы документов или языковой модели.",
        ) from exc


@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request):
    _enforce_rate_limit(request, "login", limit=5, window_seconds=15 * 60)
    superadmin_username = os.getenv("SUPERADMIN_USERNAME", "").strip()
    superadmin_password = os.getenv("SUPERADMIN_PASSWORD", "")
    if not superadmin_username or len(superadmin_password) < 14:
        raise HTTPException(
            status_code=503,
            detail="Задайте SUPERADMIN_USERNAME и пароль SUPERADMIN_PASSWORD длиной не менее 14 символов в .env.",
        )
    _session_secret()

    if (
        hmac.compare_digest(payload.username.casefold(), superadmin_username.casefold())
        and hmac.compare_digest(payload.password, superadmin_password)
    ):
        user = {"username": superadmin_username, "role": "superadmin"}
    else:
        with _admin_database() as connection:
            admin = connection.execute(
                "SELECT username, password_hash FROM admins WHERE username = ?",
                (payload.username,),
            ).fetchone()
        if not admin or not _verify_admin_password(payload.password, admin["password_hash"]):
            raise HTTPException(status_code=401, detail="Неверный логин или пароль.")
        user = {"username": admin["username"], "role": "admin"}

    response = JSONResponse({"authenticated": True, **user})
    response.set_cookie(
        SESSION_COOKIE,
        _issue_session(user["username"], user["role"]),
        max_age=SESSION_DURATION_SECONDS,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="strict",
        path="/",
    )
    return response


@app.get("/api/auth/me")
def auth_status(request: Request):
    try:
        return {"authenticated": True, **_current_user(request)}
    except HTTPException as exc:
        if exc.status_code == 401:
            return {"authenticated": False}
        raise


@app.post("/api/auth/logout")
def logout():
    response = JSONResponse({"authenticated": False})
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, samesite="strict")
    return response


@app.get("/api/admins")
def list_admins(request: Request):
    _require_superadmin(request)
    with _admin_database() as connection:
        admins = connection.execute(
            "SELECT username, created_at, created_by FROM admins ORDER BY username COLLATE NOCASE"
        ).fetchall()
    return {"admins": [dict(admin) for admin in admins]}


@app.post("/api/admins", status_code=201)
def create_admin(payload: AdminCreateRequest, request: Request):
    superadmin = _require_superadmin(request)
    reserved_username = os.getenv("SUPERADMIN_USERNAME", "").strip()
    if payload.username.casefold() == reserved_username.casefold():
        raise HTTPException(status_code=409, detail="Это имя зарезервировано за супер-администратором.")

    try:
        with _admin_database() as connection:
            connection.execute(
                "INSERT INTO admins (username, password_hash, created_at, created_by) VALUES (?, ?, ?, ?)",
                (
                    payload.username,
                    _admin_password_hash(payload.password),
                    datetime.now(timezone.utc).isoformat(),
                    superadmin["username"],
                ),
            )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Пользователь с таким логином уже существует.") from exc
    return {"username": payload.username, "role": "admin"}


@app.delete("/api/admins/{username}", status_code=204)
def delete_admin(username: str, request: Request):
    _require_superadmin(request)
    if username.casefold() == os.getenv("SUPERADMIN_USERNAME", "").strip().casefold():
        raise HTTPException(status_code=400, detail="Учётную запись супер-администратора нельзя удалить.")
    with _admin_database() as connection:
        result = connection.execute("DELETE FROM admins WHERE username = ?", (username,))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Администратор не найден.")


@app.get("/api/documents")
def list_documents():
    documents = []
    for directory in (ORIGINAL_DIR, UPLOAD_DIR):
        if not directory.exists():
            continue
        for path in directory.iterdir():
            if path.is_file() and path.suffix.lower() in ALLOWED_EXTENSIONS:
                documents.append({
                    "title": path.name,
                    "description": "Доступен для поиска в чате.",
                    "date": datetime.fromtimestamp(path.stat().st_mtime).strftime("%d.%m.%Y"),
                    "source": path.name,
                    "indexed": True,
                })
    documents.sort(key=lambda item: item["title"].lower())
    return {"documents": documents}


@app.get("/api/documents/{filename}/download")
def download_document(filename: str):
    path = _source_file(filename)
    return FileResponse(path, filename=path.name)


@app.post("/api/documents/upload")
def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(""),
):
    _current_user(request)
    filename = Path((file.filename or "").replace("\\", "/")).name
    suffix = Path(filename).suffix.lower()
    if not _is_safe_document_filename(filename):
        raise HTTPException(status_code=400, detail="Поддерживаются только файлы DOCX и PDF.")

    content = file.file.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Размер файла превышает {MAX_UPLOAD_SIZE // (1024 * 1024)} МБ.",
        )
    if not content:
        raise HTTPException(status_code=400, detail="Файл пуст.")

    try:
        text = read_docx_bytes(content) if suffix == ".docx" else read_pdf_bytes(content)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Не удалось прочитать файл. Проверьте, что он не повреждён и соответствует своему формату.",
        ) from exc

    sensitive_fields = _find_sensitive_data(text)
    if sensitive_fields:
        detected = ", ".join(sensitive_fields)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Индексация остановлена: в документе обнаружены возможные персональные "
                f"данные ({detected}). Файл не сохранён и не отправлен сервису эмбеддингов. "
                "Проверьте документ вручную и загрузите версию без персональных данных. "
                "Автоматическая проверка может ошибаться и не обнаруживает все виды данных."
            ),
        )

    chunks = create_splitter().split_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="В файле не найден текст для индексации.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    target_path = UPLOAD_DIR / filename
    if target_path.exists():
        raise HTTPException(
            status_code=409,
            detail="Файл с таким именем уже загружен. Переименуйте новый файл и повторите загрузку.",
        )

    try:
        client = QdrantClient(url=QDRANT_URL, trust_env=False)
        collection_exists = client.collection_exists(COLLECTION_NAME)
    except Exception as exc:
        logger.exception("Could not connect to Qdrant while uploading %s", filename)
        raise HTTPException(
            status_code=503,
            detail="Не удалось подключиться к Qdrant. Проверьте, что сервис запущен.",
        ) from exc
    if not collection_exists:
        raise HTTPException(
            status_code=409,
            detail="База знаний ещё не создана. Сначала выполните индексацию исходных документов.",
        )

    document_id = str(uuid.uuid4())
    clean_title = re.sub(r"[\r\n\t]+", " ", title).strip() or Path(filename).stem
    version = extract_version(text)
    metadatas = [{
        "source": filename,
        "title": clean_title,
        "version": version,
        "reference": extract_reference(chunk),
        "chunk": index,
        "file_path": str(target_path),
        "document_id": document_id,
    } for index, chunk in enumerate(chunks)]
    ids = [f"{document_id}-{index}" for index in range(len(chunks))]

    try:
        target_path.write_bytes(content)
        vector_store = QdrantVectorStore.from_existing_collection(
            embedding=get_embeddings(),
            collection_name=COLLECTION_NAME,
            url=QDRANT_URL,
            trust_env=False,
        )
        vector_store.add_texts(texts=chunks, metadatas=metadatas, ids=ids)
    except Exception as exc:
        target_path.unlink(missing_ok=True)
        logger.exception("Document indexing failed for %s", filename)
        raise HTTPException(
            status_code=502,
            detail="Не удалось проиндексировать документ. Проверьте доступность Qdrant и API эмбеддингов.",
        ) from exc

    return {
        "document": {
            "title": filename,
            "description": "Загружен и проиндексирован для поиска в чате.",
            "date": datetime.now().strftime("%d.%m.%Y"),
            "source": filename,
            "indexed": True,
        },
        "chunks": len(chunks),
        "message": f"Документ проиндексирован: {len(chunks)} фрагментов.",
    }


@app.post("/api/documents/check")
def check_document(
    file: UploadFile = File(...),
    mode: Literal["spelling", "requirements"] = Form(...),
):
    filename = Path((file.filename or "").replace("\\", "/")).name
    if Path(filename).suffix.lower() != ".docx":
        raise HTTPException(status_code=400, detail="Для проверки выберите файл DOCX.")
    content = file.file.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Размер файла превышает {MAX_UPLOAD_SIZE // (1024 * 1024)} МБ.",
        )
    try:
        text = read_docx_bytes(content)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Не удалось прочитать DOCX. Проверьте, что файл не повреждён.",
        ) from exc
    if not text.strip():
        raise HTTPException(status_code=400, detail="В документе не найден текст для проверки.")
    sensitive_fields = _find_sensitive_data(text)
    if sensitive_fields:
        detected = ", ".join(sensitive_fields)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Проверка остановлена: обнаружены возможные персональные данные "
                f"({detected}). Документ не передан внешнему AI-сервису. Удалите эти "
                "данные или проверьте файл вручную. Автоматическая проверка может "
                "ошибаться и не обнаруживает все виды данных."
            ),
        )
    try:
        return check_spelling(text) if mode == "spelling" else review_draft(text)
    except Exception as exc:
        logger.exception("Document check failed for %s", filename)
        raise HTTPException(
            status_code=502,
            detail="Не удалось проверить документ через языковую модель или базу знаний.",
        ) from exc


@app.get("/")
def index():
    return FileResponse(APP_DIR / "index.html")


@app.get("/styles.css")
def styles():
    return FileResponse(APP_DIR / "styles.css", media_type="text/css")


@app.get("/script.js")
def script():
    return FileResponse(APP_DIR / "script.js", media_type="application/javascript")
