# Claude Code Integration Guide

**Get started building with Claude Code in 5 minutes**

---

## 🎯 What You Have

A production-ready EyeMed parser that:
- Extracts benefits from PDFs using Claude Haiku
- Matches 209 exact pattern strings
- Calculates patient copays with formulas
- Includes CLI, Python API, and comprehensive docs

---

## 🚀 Quick Start for Claude Code

### 1. Setup (One Time)

```bash
# Install dependencies
pip install -r requirements.txt

# Set API key
export ANTHROPIC_API_KEY='your-key-here'

# Test it works
python cli.py validate
```

### 2. Process Your First PDF

```bash
python cli.py process your_authorization.pdf
```

You'll see:
- Extracted benefits
- Calculated copays for all products
- JSON results saved

### 3. Start Building with Claude Code

Now you're ready to extend it!

---

## 💡 What to Build Next (Examples for Claude Code)

### Example 1: Web Interface

```
Hey Claude Code, create a Flask web application where:
1. Staff can upload EyeMed PDF files
2. The system shows calculated copays in a clean table
3. Staff can select products to include in a quote
4. Generate a printable patient quote PDF
5. Save all quotes to a local SQLite database
```

### Example 2: Patient Portal

```
Claude Code, build a patient-facing web portal where:
1. Patients upload their EyeMed authorization
2. They see their available benefits in simple language
3. They can browse our product catalog with real-time copay calculations
4. They can save their selected products as a "wishlist"
5. Staff can view all patient wishlists in an admin dashboard
```

### Example 3: Practice Management Integration

```
Claude Code, create integration with our practice management system:
1. Watch a folder for new EyeMed PDFs
2. Auto-process each PDF when it appears
3. Update patient record in our PMS database with benefit info
4. Send notification to staff when processing complete
5. Generate a report of all processed authorizations this week
```

### Example 4: Multi-Carrier Expansion

```
Claude Code, extend this system to handle VSP insurance:
1. Create a similar verbatim database for VSP patterns
2. Modify the parser to detect which carrier (EyeMed vs VSP)
3. Route to appropriate extraction logic
4. Return unified results format for both carriers
5. Add CLI commands: process --carrier eyemed|vsp
```

### Example 5: Smart Product Recommendations

```
Claude Code, add intelligent product recommendations:
1. Based on extracted benefits, identify which tier products are best value
2. Calculate "savings score" for each product (insurance coverage %)
3. Recommend optimal product combinations
4. Show comparison: premium vs standard options
5. Generate recommendation report with reasoning
```

### Example 6: Analytics Dashboard

```
Claude Code, create analytics dashboard showing:
1. Most common benefit patterns seen this month
2. Average copays by product category
3. Which frame price points are most popular
4. Carrier coverage comparison (if we have multiple)
5. Export reports to Excel
Use Streamlit for the dashboard interface
```

### Example 7: API Service

```
Claude Code, convert this into a REST API:
1. POST /parse - Upload PDF, get extracted benefits
2. POST /calculate - Send benefits + products, get copays
3. GET /products - List available products
4. GET /patterns - Search verbatim database
5. Add authentication with API keys
6. Deploy with FastAPI and Docker
```

### Example 8: Mobile Backend

```
Claude Code, create a backend for mobile apps:
1. REST API for iOS/Android apps
2. Store patient authorizations in PostgreSQL
3. Track product selections per patient
4. Generate shareable quote links
5. Push notifications when new benefits available
6. Add rate limiting and caching
```

---

## 📁 Project Structure (For Context)

```
eyemed_parser/
├── config.py          - Products catalog, settings
├── verbatim_db.py     - 209-pattern database handler
├── calculator.py      - Copay formulas
└── parser.py          - Main orchestrator + Haiku API

cli.py                 - Command-line interface
examples.py            - Usage examples
README.md              - Full documentation
```

---

## 🎨 Architecture Overview (For Claude Code)

### Data Flow

```
PDF File
  ↓
Extract Text (PyPDF2)
  ↓
Send to Haiku API + Verbatim Database (209 patterns)
  ↓
Haiku Returns: {"progressive_tier_4": {"base_copay": 85, ...}}
  ↓
Python Calculator: 85 + ((393-120)*0.20) = 139.60
  ↓
Results JSON
```

### Key Classes

```python
VerbatimDatabase
  - Loads 209 patterns from Excel
  - Formats for Haiku prompt
  - Searchable

EyeMedParser
  - Main orchestrator
  - Handles PDF → extraction → calculation flow
  - Calls Haiku API

CopayCalculator
  - Takes extracted benefits + retail price
  - Applies formulas (4 types)
  - Returns copay + breakdown
```

---

## 🔧 Extension Points

### 1. Add Custom Product Categories

Edit `config.py`:
```python
PRODUCT_CATALOG["Your New Product"] = {
    "retail_price": 299,
    "benefit_category": "progressive_tier_3",
    "product_type": "lens"
}
```

### 2. Add New Formula Type

Edit `calculator.py` → `CopayCalculator.calculate()`:
```python
elif formula_type == 'your_new_formula':
    return self._your_calculation_method(retail_price, benefit_data)
```

### 3. Modify Extraction Prompt

Edit `verbatim_db.py` → `create_extraction_prompt()`:
```python
# Add custom instructions
prompt += "\nEXTRA INSTRUCTION: ..."
```

### 4. Add New CLI Commands

Edit `cli.py` → add subparser:
```python
new_parser = subparsers.add_parser('yourcommand', help='...')
```

---

## 💾 Data Storage Ideas

### SQLite Schema (Simple)

```sql
CREATE TABLE authorizations (
    id INTEGER PRIMARY KEY,
    pdf_filename TEXT,
    processed_date DATETIME,
    patient_name TEXT,
    extracted_benefits JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calculated_copays (
    id INTEGER PRIMARY KEY,
    authorization_id INTEGER,
    product_name TEXT,
    retail_price DECIMAL,
    patient_copay DECIMAL,
    FOREIGN KEY (authorization_id) REFERENCES authorizations(id)
);
```

### PostgreSQL Schema (Advanced)

```sql
-- Ask Claude Code: "Convert this to PostgreSQL with proper types and indexes"
```

---

## 🎓 Common Patterns for Claude Code

### Pattern 1: Background Processing

```python
# Claude Code can build:
from celery import Celery

app = Celery('eyemed')

@app.task
def process_pdf_async(pdf_path):
    parser = EyeMedParser(...)
    results = parser.process_pdf(pdf_path)
    # Store in database
    return results
```

### Pattern 2: Batch Upload

```python
# Claude Code can build:
from flask import Flask, request

@app.route('/upload/batch', methods=['POST'])
def batch_upload():
    files = request.files.getlist('pdfs')
    results = []
    for file in files:
        # Save temp
        # Process
        # Store
        results.append(...)
    return jsonify(results)
```

### Pattern 3: Real-Time Updates

```python
# Claude Code can build with websockets:
from flask_socketio import SocketIO, emit

@socketio.on('process_pdf')
def handle_process(pdf_data):
    emit('status', {'stage': 'extracting'})
    # Extract...
    emit('status', {'stage': 'calculating'})
    # Calculate...
    emit('complete', results)
```

---

## 📊 Testing Ideas

```python
# Ask Claude Code to build tests:
def test_progressive_tier_4_formula():
    calc = CopayCalculator()
    result = calc.calculate(393, {
        "base_copay": 85,
        "allowance": 120,
        "discount_factor": 0.20,
        "formula_type": "base_copay_plus_percentage"
    })
    assert result['patient_copay'] == 139.60
```

---

## 🚢 Deployment Ideas

### Docker
```dockerfile
# Ask Claude Code: "Create Dockerfile for this project"
FROM python:3.11-slim
COPY . /app
RUN pip install -r requirements.txt
CMD ["python", "api_server.py"]
```

### Heroku
```bash
# Ask Claude Code: "Create Heroku deployment config"
```

### AWS Lambda
```python
# Ask Claude Code: "Convert this to AWS Lambda function"
```

---

## 🎯 Success Metrics

Track these (Claude Code can build dashboard):
- PDFs processed per day
- Average processing time
- Most common benefit patterns
- Products with highest insurance coverage
- Revenue from EyeMed patients

---

## 💬 Example Conversations with Claude Code

### Start Simple

```
"Create a basic Flask web UI where I can upload a PDF 
and see the results on screen"
```

### Add Features Incrementally

```
"Now add a product selector so staff can check/uncheck 
which products to include in the quote"
```

```
"Add a 'Generate Quote' button that creates a PDF with 
patient name, selected products, and copays"
```

```
"Save all generated quotes to SQLite with timestamps 
and patient info"
```

### Go Complex

```
"Build a complete practice management integration:
- Auto-import PDFs from email attachments
- Extract patient info from PDF
- Match to existing patient in database
- Update benefit info
- Email notification to staff
- Generate weekly report
Make it production-ready with error handling, logging, and tests"
```

---

## ✅ You're Ready!

The foundation is solid. Now tell Claude Code what you want to build!

**Core system is production-ready. Extensions are unlimited.**
