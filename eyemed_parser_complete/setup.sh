#!/bin/bash
# EyeMed Parser Setup Script

echo "=========================================="
echo "EyeMed Parser System Setup"
echo "=========================================="
echo ""

# Check Python version
python_version=$(python3 --version 2>&1)
echo "✓ Found: $python_version"

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install -r requirements.txt

# Check for API key
echo ""
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠ ANTHROPIC_API_KEY not set"
    echo "  Please set it:"
    echo "  export ANTHROPIC_API_KEY='your-key-here'"
    echo ""
    echo "  Or create .env file from template:"
    echo "  cp .env.template .env"
    echo "  # Edit .env and add your API key"
else
    echo "✓ ANTHROPIC_API_KEY is set"
fi

# Validate setup
echo ""
echo "Validating setup..."
python cli.py validate

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Try it:"
echo "  python cli.py stats          # Show database stats"
echo "  python cli.py process your_pdf.pdf"
echo ""
echo "Next steps:"
echo "  1. Edit eyemed_parser/config.py with your products"
echo "  2. Process a sample PDF"
echo "  3. Use with Claude Code to build extensions"
echo ""
