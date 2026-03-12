#!/usr/bin/env python3
"""
Simple utility to extract text from PDF files
Used by TypeScript code to get PDF content for Haiku analysis
"""

import sys
import PyPDF2
import json


def extract_pdf_text(pdf_path):
    """Extract text from PDF file"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page_num, page in enumerate(pdf_reader.pages):
                text += f"--- Page {page_num + 1} ---\n"
                text += page.extract_text()
                text += "\n"

            if not text.strip():
                return {"error": "No text extracted from PDF"}

            return {
                "success": True,
                "text": text,
                "pages": len(pdf_reader.pages)
            }

    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python extract-pdf-text.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = extract_pdf_text(pdf_path)
    print(json.dumps(result))
