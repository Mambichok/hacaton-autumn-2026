import os
import re
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
from qdrant_client.http.models import Distance, VectorParams
from pypdf import PdfReader

load_dotenv()

# ======================
# НАСТРОЙКИ
# ======================
API_KEY = os.getenv("OPENAI_API_KEY")
DOCUMENTS_DIR = Path(os.getenv("DOCUMENTS_ORIGINAL_DIR", "documents/original"))
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "documents")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")


def get_embeddings() -> OpenAIEmbeddings:
    if not API_KEY:
        raise RuntimeError("Переменная OPENAI_API_KEY не задана в .env или окружении.")
    return OpenAIEmbeddings(
        model=os.getenv("OPENAI_EMBEDDING_MODEL", "nvidia/nemotron-3.5-embed-1b:free"),
        openai_api_base=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
        openai_api_key=API_KEY,
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


def main():
    files = sorted(DOCUMENTS_DIR.glob("*.docx"))
    if not files:
        raise FileNotFoundError(
            f"В папке {DOCUMENTS_DIR.resolve()} не найдено ни одного файла .docx."
        )

    splitter = create_splitter()

    texts = []
    metadatas = []

    for file in files:
        print(f"Читаю: {file.name}")
        content = read_docx(file)
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
    vector_size = len(embeddings.embed_query("Проверка размерности эмбеддинга."))
    client = QdrantClient(url=QDRANT_URL, trust_env=False)

    # Создаём коллекцию заново
    if client.collection_exists(COLLECTION_NAME):
        client.delete_collection(COLLECTION_NAME)

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )

    QdrantVectorStore.from_texts(
        texts=texts,
        embedding=embeddings,
        metadatas=metadatas,
        collection_name=COLLECTION_NAME,
        url=QDRANT_URL,
        trust_env=False,
    )

    print("Индексация завершена успешно.")

if __name__ == "__main__":
    main()