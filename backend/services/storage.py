import os
import sqlite3
import json
import hashlib
from datetime import datetime, timedelta
import asyncio

DB_FILE = os.getenv("DATABASE_FILE", "carrier_copilot.db")

def init_db():
    """Initializes SQLite database tables for cache and session storage."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Cache storage table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cache_store (
            cache_key TEXT PRIMARY KEY,
            cached_value TEXT NOT NULL,
            expires_at DATETIME NOT NULL
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_store(expires_at)")
    
    # Session history storage table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS session_store (
            session_id TEXT PRIMARY KEY,
            target_role TEXT NOT NULL,
            history TEXT NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_session_updated ON session_store(updated_at)")
    
    # Telemetry storage table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS llm_telemetry (
            id TEXT PRIMARY KEY,
            feature TEXT,
            model TEXT,
            prompt TEXT,
            response TEXT,
            latency_ms INTEGER,
            user_feedback INTEGER DEFAULT 0,
            created_at DATETIME NOT NULL
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_created ON llm_telemetry(created_at)")

    conn.commit()
    conn.close()

async def _execute_query(query: str, params: tuple = (), fetch_all: bool = False, commit: bool = False):
    """Executes a SQLite query in a separate thread pool to prevent blocking FastAPI's event loop."""
    def _run():
        conn = sqlite3.connect(DB_FILE)
        conn.execute("PRAGMA busy_timeout = 5000")
        cursor = conn.cursor()
        try:
            cursor.execute(query, params)
            if commit:
                conn.commit()
            return cursor.fetchall() if fetch_all else cursor.fetchone()
        finally:
            conn.close()
            
    return await asyncio.to_thread(_run)

def generate_cache_key(prefix: str, *args) -> str:
    """Generates a deterministic SHA256 cache key from input parameters."""
    m = hashlib.sha256()
    for arg in args:
        m.update(str(arg).encode('utf-8'))
    return f"{prefix}:{m.hexdigest()}"

class SQLiteCache:
    @staticmethod
    async def get(key: str) -> any:
        """Retrieves a value from the cache, returning None if expired or not found."""
        # Auto cleanup expired keys on read
        await SQLiteCache.clean_expired()
        
        row = await _execute_query(
            "SELECT cached_value, expires_at FROM cache_store WHERE cache_key = ?",
            (key,),
            fetch_all=False
        )
        if not row:
            return None
            
        cached_value, expires_at_str = row
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
        except ValueError:
            await SQLiteCache.delete(key)
            return None
            
        if expires_at < datetime.utcnow():
            await SQLiteCache.delete(key)
            return None
            
        try:
            return json.loads(cached_value)
        except Exception:
            return None

    @staticmethod
    async def set(key: str, value: any, ttl_hours: int = 24):
        """Saves a JSON-serializable value in the cache with a set TTL."""
        expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
        serialized = json.dumps(value)
        await _execute_query(
            "INSERT OR REPLACE INTO cache_store (cache_key, cached_value, expires_at) VALUES (?, ?, ?)",
            (key, serialized, expires_at.isoformat()),
            commit=True
        )

    @staticmethod
    async def delete(key: str):
        """Deletes a key from the cache."""
        await _execute_query("DELETE FROM cache_store WHERE cache_key = ?", (key,), commit=True)

    @staticmethod
    async def clean_expired():
        """Deletes all expired keys from the cache."""
        now = datetime.utcnow().isoformat()
        await _execute_query("DELETE FROM cache_store WHERE expires_at < ?", (now,), commit=True)

class SQLiteSessionStore:
    @staticmethod
    async def get_session(session_id: str) -> dict or None:
        """Retrieves target role and conversation history for a given session."""
        row = await _execute_query(
            "SELECT target_role, history FROM session_store WHERE session_id = ?",
            (session_id,),
            fetch_all=False
        )
        if not row:
            return None
        target_role, history_str = row
        try:
            return {
                "target_role": target_role,
                "history": json.loads(history_str)
            }
        except Exception:
            return None

    @staticmethod
    async def save_session(session_id: str, target_role: str, history: list):
        """Saves target role and conversation history for a session, updating last modified time."""
        serialized_history = json.dumps(history)
        now = datetime.utcnow().isoformat()
        await _execute_query(
            "INSERT OR REPLACE INTO session_store (session_id, target_role, history, updated_at) VALUES (?, ?, ?, ?)",
            (session_id, target_role, serialized_history, now),
            commit=True
        )
        # Periodically cleanup old sessions
        await SQLiteSessionStore.cleanup_old_sessions()

    @staticmethod
    async def cleanup_old_sessions(days_old: int = 3):
        """Cleans up inactive sessions older than 3 days to prevent database bloat."""
        cutoff = (datetime.utcnow() - timedelta(days=days_old)).isoformat()
        await _execute_query("DELETE FROM session_store WHERE updated_at < ?", (cutoff,), commit=True)

class SQLiteTelemetryStore:
    @staticmethod
    async def log_telemetry(telemetry_id: str, feature: str, model: str, prompt: str, response: str, latency_ms: int):
        """Logs LLM interaction to the telemetry table."""
        now = datetime.utcnow().isoformat()
        prompt_str = json.dumps(prompt) if not isinstance(prompt, str) else prompt
        
        await _execute_query(
            """INSERT INTO llm_telemetry 
               (id, feature, model, prompt, response, latency_ms, user_feedback, created_at) 
               VALUES (?, ?, ?, ?, ?, ?, 0, ?)""",
            (telemetry_id, feature, model, prompt_str, response, latency_ms, now),
            commit=True
        )

    @staticmethod
    async def update_feedback(telemetry_id: str, feedback: int):
        """Updates user feedback (e.g. +1 or -1) for a specific telemetry ID."""
        await _execute_query(
            "UPDATE llm_telemetry SET user_feedback = ? WHERE id = ?",
            (feedback, telemetry_id),
            commit=True
        )

