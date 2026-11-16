from pypdf import PdfReader

class DocumentService:
    def extract_text(self, file, filename: str) -> str:
            reader = PdfReader(file)
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return text.strip()

