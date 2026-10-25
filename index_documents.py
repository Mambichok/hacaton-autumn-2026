import os
import re
import uuid
from io import BytesIO
from pathlib import Path
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    CreateAlias,
    CreateAliasOperation,
    DeleteAlias,
    DeleteAliasOperation,
)
from pypdf import PdfReader
from settings import get_openrouter_api_key

load_dotenv()

# ======================
# НАСТРОЙКИ
# ======================
DOCUMENTS_DIR = Path(
    os.getenv("DOCUMENTS_ORIGINAL_DIR", "documents/original")
)
UPLOAD_DIR = Path(os.getenv("DOCUMENTS_UPLOAD_DIR", "documents/uploaded"))
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "documents")
ACTIVE_COLLECTION_NAME = f"{COLLECTION_NAME}_active"
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")


def get_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model=os.getenv("OPENAI_EMBEDDING_MODEL", "nvidia/nemotron-3.5-embed-1b:free"),
        openai_api_base=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
        openai_api_key=get_openrouter_api_key(),
        check_embedding_ctx_length=False,
    )


def read_docx(path: Path) -> str:
    return read_docx_bytes(path.read_bytes())


def read_docx_bytes(content: bytes) -> str:
    document = Document(BytesIO(content))
    blocks = []

    for block in document.iter_inner_content():
        if isinstance(block, Paragraph):
            text = block.text.strip()
            if text:
                blocks.append(text)
        elif isinstance(block, Table):
            for row in block.rows:
                cells = [cell.text.strip().replace("\n", " / ") for cell in row.cells]
                if any(cells):
                    blocks.append(" | ".join(cells))

    return "\n\n".join(blocks)


def read_pdf_bytes(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(text for text in pages if text.strip())


def create_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " ", ""]
    )


def extract_version(content: str) -> str:
    match = re.search(
        r"\b(?:версия|редакция)\s*(?:документа)?\s*[:№]?\s*([0-9]+(?:[.,][0-9]+)*)",
        content,
        flags=re.IGNORECASE,
    )
    return match.group(1) if match else "не указана"


def extract_reference(chunk: str) -> str:
    for line in chunk.splitlines():
        stripped = line.strip()
        match = re.match(
            r"^(?:пункт\s+)?(\d+(?:\.\d+){0,5})(?:[.)]|\s|$)",
            stripped,
            flags=re.IGNORECASE,
        )
        if match:
            return f"Пункт {match.group(1)}"

        match = re.match(
            r"^(раздел|глава|приложение)\s+([^\s:]+)",
            stripped,
            flags=re.IGNORECASE,
        )
        if match:
            return f"{match.group(1).capitalize()} {match.group(2)}"

    return ""


def ensure_active_collection(client: QdrantClient) -> bool:
    aliases = client.get_aliases().aliases
    if any(alias.alias_name == ACTIVE_COLLECTION_NAME for alias in aliases):
        return True
    if not client.collection_exists(COLLECTION_NAME):
        return False
    try:
        client.update_collection_aliases([
            CreateAliasOperation(
                create_alias=CreateAlias(
                    collection_name=COLLECTION_NAME,
                    alias_name=ACTIVE_COLLECTION_NAME,
                )
            )
        ])
    except Exception:
        if any(
            alias.alias_name == ACTIVE_COLLECTION_NAME
            for alias in client.get_aliases().aliases
        ):
            return True
        raise
    return True


def replace_active_collection(
    client: QdrantClient,
    texts: list[str],
    metadatas: list[dict],
    embeddings: OpenAIEmbeddings,
) -> None:
    staged_name = f"{COLLECTION_NAME}_build_{uuid.uuid4().hex}"
    aliases = client.get_aliases().aliases
    current_alias = next(
        (alias for alias in aliases if alias.alias_name == ACTIVE_COLLECTION_NAME),
        None,
    )
    try:
        QdrantVectorStore.from_texts(
            texts=texts,
            embedding=embeddings,
            metadatas=metadatas,
            collection_name=staged_name,
            url=QDRANT_URL,
            trust_env=False,
        )
        indexed_count = client.count(staged_name, exact=True).count
        if indexed_count != len(texts):
            raise RuntimeError(
                f"Ожидалось {len(texts)} фрагментов, в новой коллекции найдено {indexed_count}."
            )

        operations = []
        if current_alias:
            operations.append(
                DeleteAliasOperation(
                    delete_alias=DeleteAlias(alias_name=ACTIVE_COLLECTION_NAME)
                )
            )
        operations.append(
            CreateAliasOperation(
                create_alias=CreateAlias(
                    collection_name=staged_name,
                    alias_name=ACTIVE_COLLECTION_NAME,
                )
            )
        )
        client.update_collection_aliases(operations)
    except Exception:
        try:
            staged_is_active = any(
                alias.alias_name == ACTIVE_COLLECTION_NAME
                and alias.collection_name == staged_name
                for alias in client.get_aliases().aliases
            )
            if not staged_is_active and client.collection_exists(staged_name):
                client.delete_collection(staged_name)
        except Exception as cleanup_error:
            print(f"Предупреждение: не удалось очистить временную коллекцию {staged_name}: {cleanup_error}")
        raise

    if current_alias and current_alias.collection_name.startswith(
        f"{COLLECTION_NAME}_build_"
    ):
        try:
            client.delete_collection(current_alias.collection_name)
        except Exception as cleanup_error:
            print(
                "Предупреждение: новая база активна, но не удалось удалить предыдущую "
                f"коллекцию {current_alias.collection_name}: {cleanup_error}"
            )


def get_document_files() -> list[Path]:
    return sorted(
        (
            file
            for directory in (DOCUMENTS_DIR, UPLOAD_DIR)
            if directory.exists()
            for file in directory.iterdir()
            if file.is_file() and file.suffix.lower() in {".docx", ".pdf"}
        ),
        key=lambda file: (file.name.lower(), str(file.parent).lower()),
    )


def main():
    files = get_document_files()
    if not files:
        raise FileNotFoundError(
            "В папках исходных и загруженных документов не найдено ни одного DOCX или PDF: "
            f"{DOCUMENTS_DIR.resolve()}, {UPLOAD_DIR.resolve()}."
        )

    splitter = create_splitter()

    texts = []
    metadatas = []

    for file in files:
        print(f"Читаю: {file.name}")
        content = (
            read_docx(file)
            if file.suffix.lower() == ".docx"
            else read_pdf_bytes(file.read_bytes())
        )
        if not content:
            print(f"Пропускаю пустой документ: {file.name}")
            continue

        chunks = splitter.split_text(content)
        version = extract_version(content)
        for i, chunk in enumerate(chunks):
            texts.append(chunk)
            metadatas.append({
                "source": file.name,
                "version": version,
                "reference": extract_reference(chunk),
                "chunk": i,
                "file_path": str(file)
            })

    if not texts:
        raise ValueError(f"В документах из {DOCUMENTS_DIR.resolve()} не найден текст для индексации.")

    print(f"Всего чанков: {len(texts)}")

    embeddings = get_embeddings()
    client = QdrantClient(url=QDRANT_URL, trust_env=False)

    replace_active_collection(client, texts, metadatas, embeddings)

    print(
        "Индексация завершена успешно. "
        f"Активная база «{ACTIVE_COLLECTION_NAME}» содержит {len(texts)} фрагментов."
    )

if __name__ == "__main__":
    main()