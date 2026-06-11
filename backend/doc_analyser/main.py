import base64
import json
import os
from typing import Literal

import fitz  # PyMuPDF
import pdfplumber
from dotenv import load_dotenv  # type: ignore
from pydantic import BaseModel

from client import AnthropicClient
from prompts import analysis_prompt, page_identification_prompt


class Point(BaseModel):
    easting: int
    northing: int


class PDFData(BaseModel):
    document_id: str
    eval_document_type: Literal["map", "report", "other"]
    eval_location: Point
    document_src: str


class OutputFormat(BaseModel):
    document_type: Literal["map", "report", "other"]
    comments: str
    reasoning: str
    confidence: int
    location: Point | None = None


class EvalResult(BaseModel):
    document_id: str
    correct_type: bool


class PageIdentificationFormat(BaseModel):
    page_number: int
    comment: str
    confidence: int


class DataProcessor:
    def __init__(self, data_path: str):
        self.data_path = data_path

    def load_data(self) -> list[PDFData]:
        with open(self.data_path, "r") as f:
            data_json = json.load(f)
        data_list = []
        for doc_id, doc_info in data_json.items():
            data_list.append(
                PDFData(
                    document_id=doc_id,
                    document_src=doc_info.get("src"),
                    eval_document_type=doc_info.get("type", "other"),
                    eval_location=Point(
                        easting=doc_info["location"]["easting"],
                        northing=doc_info["location"]["northing"],
                    ),
                )
            )
        return data_list

    def get_pdf_content(
        self,
        pdf_path: str,
        max_pages: int | None = None,
        page_indices: list[int] | None = None,
    ) -> str:
        with pdfplumber.open(pdf_path) as pdf:
            if page_indices is not None:
                pages = [pdf.pages[i] for i in page_indices if i < len(pdf.pages)]
            elif max_pages is not None:
                pages = pdf.pages[:max_pages]
            else:
                pages = pdf.pages
            text = ""
            for page in pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        return text.strip()

    def get_pdf_base64(self, pdf_path: str, page_number: int | None = None) -> str:
        """Convert a PDF to a base64 string. If page_number is specified, extracts
        that single page as a self-contained PDF for the model to analyse.

        Args:
            pdf_path (str): PDF file path
            page_number (int | None): 0-indexed page to extract. None sends the full PDF.

        Returns:
            str: Base64 encoded PDF bytes
        """

        src = fitz.open(pdf_path)
        if page_number is not None:
            single = fitz.open()
            single.insert_pdf(src, from_page=page_number, to_page=page_number)
            pdf_bytes = single.tobytes()
        else:
            pdf_bytes = src.tobytes()
        return base64.b64encode(pdf_bytes).decode("utf-8")

    def location_to_geojson(self, location: Point) -> dict:
        return {
            "type": "Point",
            "coordinates": [location.easting, location.northing],
        }


class Agent:
    def __init__(self, anthropic_client: AnthropicClient, processor: DataProcessor):
        self.client = anthropic_client
        self.processor = processor

    def run_page_identification(self, input_data: PDFData) -> list[int]:
        pdf_content = self.processor.get_pdf_base64(input_data.document_src)
        prompt = page_identification_prompt()
        response = self.client.generate_response_pdf(
            response_format=list[PageIdentificationFormat],
            doc=pdf_content,
            prompt=prompt,
        )
        sorted_pages = sorted(response, key=lambda p: p.confidence, reverse=True)  # type: ignore
        return [p.page_number for p in sorted_pages]

    def run(
        self, input_data: PDFData, page_numbers: list[int] | None = None
    ) -> OutputFormat:
        pdf_content = self.processor.get_pdf_content(
            input_data.document_src,
            page_indices=page_numbers,
            max_pages=None if page_numbers else 5,
        )
        prompt = analysis_prompt(pdf_content)
        response = self.client.generate_response(prompt, response_format=OutputFormat)
        return response


def main():
    load_dotenv()
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key is None:
        raise ValueError("ANTHROPIC_API_KEY not found in environment variables")

    processor = DataProcessor("data.json")
    data = processor.load_data()
    anthropic_client = AnthropicClient(api_key)
    agent = Agent(anthropic_client, processor)

    results: list[OutputFormat] = []
    for doc in data:
        print(f"Processing {doc.document_id}...")
        page_numbers = agent.run_page_identification(doc)
        print(f"  Identified pages: {page_numbers}")
        result = agent.run(doc, page_numbers=page_numbers)
        results.append(result)
        print(f"  Type: {result.document_type}, Confidence: {result.confidence}")
        print(f"  {result.comments}")
        if result.location:
            print(
                f"  Location: easting={result.location.easting}, northing={result.location.northing}"
            )

    return results


if __name__ == "__main__":
    main()
