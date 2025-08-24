"""
RAG Studio Python Functions
Simple Python greeting function callable from Rust using PyO3.
"""

def greet_from_python(name):
    """
    Simple greeting function demonstrating Rust -> Python call.
    """
    return f"🐍 Hello {name}, this message comes from Python via pure PyO3!"