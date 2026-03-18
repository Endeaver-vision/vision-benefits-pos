"""
EyeMed Parser Package
Complete system for parsing EyeMed vision insurance authorizations
and calculating patient copays
"""

__version__ = "1.0.0"

from .parser import EyeMedParser, quick_process
from .calculator import CopayCalculator, calculate_product_copays
from .verbatim_db import VerbatimDatabase
from .config import PRODUCT_CATALOG

__all__ = [
    'EyeMedParser',
    'quick_process',
    'CopayCalculator',
    'calculate_product_copays',
    'VerbatimDatabase',
    'PRODUCT_CATALOG',
]
