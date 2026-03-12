#!/usr/bin/env python3
"""
Extract text from PDF files.

Usage:
    python3 extract-pdf-text.py <pdf_file_path>

Output:
    JSON with extracted text
"""

import sys
import json
import PyPDF2

def extract_pdf_text(pdf_path):
    """Extract text from PDF file."""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""

            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"

            return {
                "success": True,
                "text": text.strip(),
                "pages": len(pdf_reader.pages)
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": ""
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Missing PDF file path",
            "text": ""
        }))
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = extract_pdf_text(pdf_path)
    print(json.dumps(result))
