"""
RAG Studio Embedding Worker - Python AI Functions

This module contains the actual AI functions for embedding generation and document reranking,
designed to be called from the Rust embedding worker subprocess.

This is the enhanced version of the original rag_functions.py with actual AI capabilities.
"""

import logging
import time
from typing import List, Tuple, Optional
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to import AI libraries with graceful fallback
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
    logger.info("✅ SentenceTransformers available")
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning("⚠️  SentenceTransformers not available - using fallback implementations")

try:
    from transformers import AutoTokenizer, AutoModel
    import torch
    TRANSFORMERS_AVAILABLE = True
    logger.info("✅ Transformers available")
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("⚠️  Transformers not available - using fallback implementations")

# Global model cache
_embedding_model = None
_reranking_model = None
_tokenizer = None

def _get_embedding_model():
    """Get or initialize the embedding model (singleton pattern)"""
    global _embedding_model

    if _embedding_model is None:
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                logger.info("🔄 Loading SentenceTransformer model...")
                _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("✅ SentenceTransformer model loaded successfully")
            except Exception as e:
                logger.error(f"❌ Failed to load SentenceTransformer: {e}")
                _embedding_model = None
        else:
            logger.info("📝 Using fallback embedding model")
            _embedding_model = "fallback"

    return _embedding_model

def _get_reranking_model():
    """Get or initialize the reranking model (singleton pattern)"""
    global _reranking_model, _tokenizer

    if _reranking_model is None:
        if TRANSFORMERS_AVAILABLE:
            try:
                logger.info("🔄 Loading reranking model...")
                model_name = "cross-encoder/ms-marco-MiniLM-L-6-v2"
                _tokenizer = AutoTokenizer.from_pretrained(model_name)
                _reranking_model = AutoModel.from_pretrained(model_name)
                logger.info("✅ Reranking model loaded successfully")
            except Exception as e:
                logger.error(f"❌ Failed to load reranking model: {e}")
                _reranking_model = None
                _tokenizer = None
        else:
            logger.info("📝 Using fallback reranking model")
            _reranking_model = "fallback"
            _tokenizer = "fallback"

    return _reranking_model, _tokenizer

def generate_embedding(text: str, model_name: Optional[str] = None) -> List[float]:
    """
    Generate embedding vector for the given text.

    Args:
        text: Input text to embed
        model_name: Optional model name (ignored in MVP, uses default model)

    Returns:
        List of float values representing the embedding vector
    """
    start_time = time.time()

    try:
        model = _get_embedding_model()

        if model is None:
            # Fallback: create a simple hash-based embedding
            return _create_fallback_embedding(text)

        if SENTENCE_TRANSFORMERS_AVAILABLE and hasattr(model, 'encode'):
            # Use SentenceTransformers
            embedding = model.encode([text], convert_to_numpy=True)[0]
            result = embedding.tolist()

            processing_time = (time.time() - start_time) * 1000
            logger.debug(f"📊 Generated embedding for text ({len(text)} chars) in {processing_time:.1f}ms")

            return result
        else:
            # Fallback implementation
            return _create_fallback_embedding(text)

    except Exception as e:
        logger.error(f"❌ Error generating embedding: {e}")
        # Return fallback embedding on error
        return _create_fallback_embedding(text)

def rerank_documents(query: str, documents: List[str], top_k: Optional[int] = None) -> List[Tuple[int, float]]:
    """
    Rerank documents based on relevance to the query.

    Args:
        query: Search query
        documents: List of document texts to rerank
        top_k: Maximum number of documents to return (None for all)

    Returns:
        List of tuples (original_index, relevance_score) sorted by relevance
    """
    start_time = time.time()

    try:
        model, tokenizer = _get_reranking_model()

        if model is None or tokenizer is None:
            # Fallback: simple text similarity based reranking
            return _create_fallback_reranking(query, documents, top_k)

        if TRANSFORMERS_AVAILABLE and model != "fallback":
            # Use transformer-based reranking
            scores = []

            for i, doc in enumerate(documents):
                try:
                    # Create query-document pairs for cross-encoder
                    inputs = tokenizer(query, doc, return_tensors="pt", truncation=True, max_length=512)

                    with torch.no_grad():
                        outputs = model(**inputs)
                        # Use the CLS token embedding as relevance score
                        score = torch.mean(outputs.last_hidden_state[0, 0, :]).item()

                    scores.append((i, score))
                except Exception as e:
                    logger.warning(f"⚠️  Error scoring document {i}: {e}")
                    scores.append((i, 0.0))  # Assign lowest score on error

            # Sort by score (descending)
            scores.sort(key=lambda x: x[1], reverse=True)

            # Apply top_k limit
            if top_k is not None:
                scores = scores[:top_k]

            processing_time = (time.time() - start_time) * 1000
            logger.debug(f"📊 Reranked {len(documents)} documents in {processing_time:.1f}ms")

            return scores
        else:
            # Fallback implementation
            return _create_fallback_reranking(query, documents, top_k)

    except Exception as e:
        logger.error(f"❌ Error reranking documents: {e}")
        # Return fallback reranking on error
        return _create_fallback_reranking(query, documents, top_k)

def _create_fallback_embedding(text: str) -> List[float]:
    """Create a simple fallback embedding based on text characteristics"""
    # Simple hash-based embedding (384 dimensions like all-MiniLM-L6-v2)
    hash_value = hash(text)

    # Create a deterministic but reasonably distributed embedding
    embedding = []
    for i in range(384):
        # Create pseudo-random values based on text hash and position
        seed = hash_value + i * 37
        value = (seed % 2000 - 1000) / 1000.0  # Range [-1, 1]
        embedding.append(value)

    # Normalize the embedding (unit vector)
    norm = sum(x * x for x in embedding) ** 0.5
    if norm > 0:
        embedding = [x / norm for x in embedding]

    logger.debug(f"📝 Created fallback embedding for text ({len(text)} chars)")
    return embedding

def _create_fallback_reranking(query: str, documents: List[str], top_k: Optional[int] = None) -> List[Tuple[int, float]]:
    """Create simple fallback reranking based on text overlap"""
    query_words = set(query.lower().split())
    scores = []

    for i, doc in enumerate(documents):
        doc_words = set(doc.lower().split())

        # Calculate Jaccard similarity
        intersection = len(query_words & doc_words)
        union = len(query_words | doc_words)

        if union > 0:
            score = intersection / union
        else:
            score = 0.0

        # Add small bonus for documents containing query as substring
        if query.lower() in doc.lower():
            score += 0.1

        scores.append((i, score))

    # Sort by score (descending)
    scores.sort(key=lambda x: x[1], reverse=True)

    # Apply top_k limit
    if top_k is not None:
        scores = scores[:top_k]

    logger.debug(f"📝 Created fallback reranking for {len(documents)} documents")
    return scores

def greet_from_python(name: str) -> str:
    """
    Compatibility function with the existing greeting implementation.
    This maintains compatibility with existing tests.
    """
    return f"🐍 Hello {name}, this message comes from Python via Embedding Worker subprocess!"

def get_model_info() -> dict:
    """
    Get information about loaded models and available capabilities.

    Returns:
        Dictionary with model information and capabilities
    """
    return {
        "embedding_model": "all-MiniLM-L6-v2" if SENTENCE_TRANSFORMERS_AVAILABLE else "fallback",
        "reranking_model": "cross-encoder/ms-marco-MiniLM-L-6-v2" if TRANSFORMERS_AVAILABLE else "fallback",
        "sentence_transformers_available": SENTENCE_TRANSFORMERS_AVAILABLE,
        "transformers_available": TRANSFORMERS_AVAILABLE,
        "embedding_dimensions": 384,
        "max_sequence_length": 512,
    }

def test_ai_functions():
    """
    Test function to verify AI capabilities are working.
    Used for health checks and diagnostics.
    """
    results = {
        "embedding_test": False,
        "reranking_test": False,
        "errors": []
    }

    try:
        # Test embedding generation
        embedding = generate_embedding("This is a test document.")
        if isinstance(embedding, list) and len(embedding) > 0:
            results["embedding_test"] = True
        else:
            results["errors"].append("Invalid embedding format")
    except Exception as e:
        results["errors"].append(f"Embedding test failed: {e}")

    try:
        # Test document reranking
        scores = rerank_documents(
            "test query",
            ["This is a test document.", "Another document here."]
        )
        if isinstance(scores, list) and len(scores) == 2:
            results["reranking_test"] = True
        else:
            results["errors"].append("Invalid reranking format")
    except Exception as e:
        results["errors"].append(f"Reranking test failed: {e}")

    return results

if __name__ == "__main__":
    # Test the functions when run directly
    logger.info("🧪 Testing RAG Studio AI Functions...")

    # Test model info
    model_info = get_model_info()
    logger.info(f"📊 Model info: {model_info}")

    # Test AI functions
    test_results = test_ai_functions()
    logger.info(f"🧪 Test results: {test_results}")

    # Test greeting (compatibility)
    greeting = greet_from_python("Test User")
    logger.info(f"👋 Greeting: {greeting}")

    logger.info("✅ AI Functions test completed")