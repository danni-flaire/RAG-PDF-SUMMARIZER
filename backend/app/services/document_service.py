from pypdf import PdfReader, errors, PdfReadError, EmptyFileError

class DocumentService:
    def extract_text(self, file, filename: str) -> str:
        try:
            reader = PdfReader(file)
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return text.strip()
        except pypdf.errors.PdfReadError as e:
            raise RuntimeError(f"Failed to read PDF file '{filename}': {str(e)}") from e
        except pypdf.errors.EmptyFileError as e:
            raise RuntimeError(f"Failed to read PDF file '{filename}': {str(e)}") from e
