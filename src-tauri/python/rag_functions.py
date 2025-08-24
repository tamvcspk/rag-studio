"""
RAG Studio Python Functions
Simple Python functions callable from Rust using PyO3 only.
Enhanced with external library imports to test PyOxidizer embedding.
"""

# Import standard libraries
import sys
import json
import math
import datetime
from collections import defaultdict

# Try to import third-party libraries for POC
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

def greet_from_python(name):
    """
    Simple greeting function demonstrating Rust -> Python call.
    """
    return f"🐍 Hello {name}, this message comes from Python via pure PyO3!"

def calculate_numbers(x, y):
    """
    Perform mathematical calculations.
    """
    result = {
        "sum": x + y,
        "product": x * y,
        "difference": x - y,
        "average": (x + y) / 2
    }
    print(f"Python calculated: {x}, {y} -> {result}")
    return result

def process_text_data(text):
    """
    Simple text processing function for RAG operations.
    """
    if not isinstance(text, str):
        return {"error": "Input must be a string"}
    
    words = text.split()
    processed = {
        "original": text,
        "word_count": len(words),
        "char_count": len(text),
        "uppercase": text.upper(),
        "lowercase": text.lower(),
        "words": words,
        "reversed": text[::-1]
    }
    
    print(f"Python processed text: '{text}' -> {len(words)} words")
    return processed

def rag_search_simulation(query, documents):
    """
    Simulate a simple RAG search operation.
    This demonstrates how Rust could call Python for AI/ML operations.
    """
    if not isinstance(query, str) or not isinstance(documents, list):
        return {"error": "Invalid input types"}
    
    # Simple keyword-based search simulation
    results = []
    for i, doc in enumerate(documents):
        if isinstance(doc, str):
            # Count matching words (case insensitive)
            query_words = query.lower().split()
            doc_words = doc.lower().split()
            matches = sum(1 for word in query_words if word in doc_words)
            
            if matches > 0:
                results.append({
                    "document_id": i,
                    "content": doc,
                    "relevance_score": matches / len(query_words),
                    "matches": matches
                })
    
    # Sort by relevance score
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    
    search_result = {
        "query": query,
        "total_documents": len(documents),
        "matches_found": len(results),
        "results": results[:3]  # Top 3 results
    }
    
    print(f"Python RAG search: '{query}' found {len(results)} matches")
    return search_result

def get_system_info():
    """
    Get Python system information for debugging.
    """
    import platform
    
    info = {
        "python_version": sys.version,
        "platform": platform.platform(),
        "architecture": platform.architecture(),
        "processor": platform.processor(),
        "integration_type": "Pure PyO3 (no plugin)",
        "has_requests": HAS_REQUESTS,
        "has_numpy": HAS_NUMPY,
        "available_modules": [module for module in ["requests", "numpy", "json", "math", "datetime"] if module in sys.modules or module in ["json", "math", "datetime"]]
    }
    
    return info

def demo_external_libraries():
    """
    Demonstrate usage of external Python libraries for POC.
    This function tests if embedded libraries work correctly.
    """
    results = {
        "timestamp": datetime.datetime.now().isoformat(),
        "tests": []
    }
    
    # Test standard library functions
    results["tests"].append({
        "library": "math",
        "test": "sqrt(16)",
        "result": math.sqrt(16),
        "status": "success"
    })
    
    results["tests"].append({
        "library": "json", 
        "test": "dumps/loads roundtrip",
        "result": json.loads(json.dumps({"test": "data"})),
        "status": "success"
    })
    
    # Test numpy if available
    if HAS_NUMPY:
        try:
            arr = np.array([1, 2, 3, 4, 5])
            results["tests"].append({
                "library": "numpy",
                "test": "array creation and mean",
                "result": {
                    "array": arr.tolist(),
                    "mean": float(np.mean(arr)),
                    "sum": int(np.sum(arr))
                },
                "status": "success"
            })
        except Exception as e:
            results["tests"].append({
                "library": "numpy",
                "test": "array operations", 
                "result": str(e),
                "status": "error"
            })
    else:
        results["tests"].append({
            "library": "numpy",
            "test": "import check",
            "result": "numpy not available",
            "status": "skipped"
        })
    
    # Test requests if available
    if HAS_REQUESTS:
        try:
            # Simple test that doesn't require internet
            session = requests.Session()
            results["tests"].append({
                "library": "requests",
                "test": "session creation",
                "result": f"Session created: {type(session).__name__}",
                "status": "success"
            })
        except Exception as e:
            results["tests"].append({
                "library": "requests", 
                "test": "session creation",
                "result": str(e),
                "status": "error"
            })
    else:
        results["tests"].append({
            "library": "requests",
            "test": "import check",
            "result": "requests not available",
            "status": "skipped"
        })
    
    return results

def advanced_text_processing(text):
    """
    Advanced text processing using multiple standard library modules.
    Demonstrates complex operations that would benefit from embedding.
    """
    if not isinstance(text, str):
        return {"error": "Input must be a string"}
    
    # Use collections.defaultdict for word frequency
    word_freq = defaultdict(int)
    words = text.lower().split()
    
    for word in words:
        # Clean word of punctuation
        clean_word = ''.join(char for char in word if char.isalnum())
        if clean_word:
            word_freq[clean_word] += 1
    
    # Statistical analysis using math module
    word_lengths = [len(word) for word in words if word.strip()]
    avg_length = sum(word_lengths) / len(word_lengths) if word_lengths else 0
    max_length = max(word_lengths) if word_lengths else 0
    min_length = min(word_lengths) if word_lengths else 0
    
    # Use datetime for processing timestamp
    processed_at = datetime.datetime.now()
    
    result = {
        "original_text": text,
        "processed_at": processed_at.isoformat(),
        "statistics": {
            "total_words": len(words),
            "unique_words": len(word_freq),
            "avg_word_length": round(avg_length, 2),
            "max_word_length": max_length,
            "min_word_length": min_length
        },
        "word_frequency": dict(sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]),
        "text_hash": hash(text) % 10000,  # Simple hash for demo
    }
    
    # Add numpy analysis if available
    if HAS_NUMPY and word_lengths:
        try:
            lengths_array = np.array(word_lengths)
            result["numpy_stats"] = {
                "std_deviation": float(np.std(lengths_array)),
                "median": float(np.median(lengths_array)),
                "percentile_75": float(np.percentile(lengths_array, 75)),
                "percentile_25": float(np.percentile(lengths_array, 25))
            }
        except Exception as e:
            result["numpy_error"] = str(e)
    
    return result