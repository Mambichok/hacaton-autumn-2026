import unittest
from io import BytesIO
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi import HTTPException
from fastapi import UploadFile
from starlette.requests import Request

import app as application
from settings import get_openrouter_api_key


def make_request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/chat",
            "headers": [],
            "client": ("127.0.0.1", 12345),
            "server": ("127.0.0.1", 8000),
            "scheme": "http",
            "query_string": b"",
        }
    )


class SecurityControlTests(unittest.TestCase):
    def test_openrouter_key_is_preferred_over_legacy_key(self):
        with patch.dict(
            os.environ,
            {
                "OPENROUTER_API_KEY": "new-openrouter-key",
                "OPENAI_API_KEY": "legacy-key",
            },
        ):
            self.assertEqual(get_openrouter_api_key(), "new-openrouter-key")

    def test_legacy_openai_key_remains_supported(self):
        with patch.dict(
            os.environ,
            {"OPENROUTER_API_KEY": "", "OPENAI_API_KEY": "legacy-key"},
        ):
            self.assertEqual(get_openrouter_api_key(), "legacy-key")

    def test_embedding_daily_quota_error_has_actionable_message(self):
        detail = application._embedding_quota_error_detail(
            RuntimeError(
                "Error 429: free-models-per-day quota exceeded"
            )
        )

        self.assertIn("дневной лимит", detail)
        self.assertIn("переиндексация", detail)
        self.assertIsNone(
            application._embedding_quota_error_detail(
                RuntimeError("Unexpected provider error")
            )
        )

    def test_chat_reports_embedding_daily_quota(self):
        request = application.ChatRequest(question="Вопрос по регламенту")

        with patch.object(
            application,
            "ask_bot",
            side_effect=RuntimeError("free-models-per-day limit exceeded"),
        ):
            with self.assertRaises(HTTPException) as error:
                application.chat(request, make_request())

        self.assertEqual(error.exception.status_code, 503)
        self.assertIn("дневной лимит", error.exception.detail)

    def test_detects_obvious_personal_data_without_returning_values(self):
        found = application._find_sensitive_data(
            "Почта user@example.ru, телефон +7 999 123-45-67 и ИНН 1234567890"
        )

        self.assertEqual(found, ["email", "телефон", "ИНН"])

    def test_chat_blocks_personal_data_before_calling_ai(self):
        request = application.ChatRequest(question="Напишите на user@example.ru")

        with patch.object(application, "ask_bot") as ask_bot:
            with self.assertRaises(HTTPException) as error:
                application.chat(request, make_request())

        self.assertEqual(error.exception.status_code, 400)
        self.assertIn("Запрос не передан AI-сервису", error.exception.detail)
        ask_bot.assert_not_called()

    def test_chat_blocks_sensitive_values_in_history(self):
        request = application.ChatRequest(
            question="Продолжим по теме",
            history=[{"role": "user", "content": "Мой ИНН 1234567890"}],
        )

        with patch.object(application, "ask_bot") as ask_bot:
            with self.assertRaises(HTTPException) as error:
                application.chat(request, make_request())

        self.assertEqual(error.exception.status_code, 400)
        ask_bot.assert_not_called()

    def test_rate_limiter_returns_retry_after_and_resets(self):
        limiter = application.InMemoryRateLimiter()

        with patch.object(application.time, "monotonic", side_effect=[100, 100, 161]):
            self.assertEqual(limiter.check("test", "client", 1, 60), 0)
            self.assertEqual(limiter.check("test", "client", 1, 60), 60)
            self.assertEqual(limiter.check("test", "client", 1, 60), 0)

    def test_chat_endpoint_limits_requests_per_client(self):
        with patch.object(application, "rate_limiter", application.InMemoryRateLimiter()):
            with patch.object(application, "ask_bot", return_value={"answer": "OK", "sources": []}):
                for _ in range(20):
                    application.chat(
                        application.ChatRequest(question="Вопрос по регламенту"),
                        make_request(),
                    )
                with self.assertRaises(HTTPException) as error:
                    application.chat(
                        application.ChatRequest(question="Ещё вопрос"),
                        make_request(),
                    )

        self.assertEqual(error.exception.status_code, 429)
        self.assertIn("Retry-After", error.exception.headers)

    def test_login_endpoint_limits_attempts_per_client(self):
        with patch.object(application, "rate_limiter", application.InMemoryRateLimiter()):
            with patch.dict(os.environ, {"SUPERADMIN_USERNAME": "", "SUPERADMIN_PASSWORD": ""}):
                for _ in range(5):
                    with self.assertRaises(HTTPException) as error:
                        application.login(
                            application.LoginRequest(username="admin", password="invalid"),
                            make_request(),
                        )
                    self.assertEqual(error.exception.status_code, 503)

                with self.assertRaises(HTTPException) as error:
                    application.login(
                        application.LoginRequest(username="admin", password="invalid"),
                        make_request(),
                    )

        self.assertEqual(error.exception.status_code, 429)

    def test_document_with_detected_personal_data_is_blocked_before_embedding(self):
        with TemporaryDirectory() as temporary_directory:
            upload_directory = Path(temporary_directory) / "uploaded"
            upload = UploadFile(
                filename="staff.docx",
                file=BytesIO(b"docx test"),
            )
            with (
                patch.object(application, "UPLOAD_DIR", upload_directory),
                patch.object(application, "_current_user"),
                patch.object(
                    application,
                    "read_docx_bytes",
                    return_value="Сотрудник: user@example.ru",
                ),
                patch.object(application, "QdrantClient") as qdrant_client,
                patch.object(application, "get_embeddings") as get_embeddings,
            ):
                with self.assertRaises(HTTPException) as error:
                    application.upload_document(make_request(), upload, "")

        self.assertEqual(error.exception.status_code, 400)
        self.assertIn("Файл не сохранён", error.exception.detail)
        self.assertIn("не отправлен сервису эмбеддингов", error.exception.detail)
        self.assertFalse(upload_directory.exists())
        qdrant_client.assert_not_called()
        get_embeddings.assert_not_called()

    def test_pdf_with_detected_personal_data_is_blocked_before_embedding(self):
        with TemporaryDirectory() as temporary_directory:
            upload_directory = Path(temporary_directory) / "uploaded"
            upload = UploadFile(
                filename="staff.pdf",
                file=BytesIO(b"pdf test"),
            )
            with (
                patch.object(application, "UPLOAD_DIR", upload_directory),
                patch.object(application, "_current_user"),
                patch.object(
                    application,
                    "read_pdf_bytes",
                    return_value="Email отдела: user@example.ru",
                ),
                patch.object(application, "QdrantClient") as qdrant_client,
                patch.object(application, "get_embeddings") as get_embeddings,
            ):
                with self.assertRaises(HTTPException) as error:
                    application.upload_document(make_request(), upload, "")

        self.assertEqual(error.exception.status_code, 400)
        self.assertIn("Файл не сохранён", error.exception.detail)
        self.assertFalse(upload_directory.exists())
        qdrant_client.assert_not_called()
        get_embeddings.assert_not_called()

    def test_document_check_with_personal_data_is_blocked_before_ai(self):
        upload = UploadFile(
            filename="staff.docx",
            file=BytesIO(b"docx test"),
        )
        with (
            patch.object(
                application,
                "read_docx_bytes",
                return_value="Контакт сотрудника: user@example.ru",
            ),
            patch.object(application, "review_draft") as review_draft,
        ):
            with self.assertRaises(HTTPException) as error:
                application.check_document(upload)

        self.assertEqual(error.exception.status_code, 400)
        self.assertIn("Документ не передан внешнему AI-сервису", error.exception.detail)
        review_draft.assert_not_called()


if __name__ == "__main__":
    unittest.main()
