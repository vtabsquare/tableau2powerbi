from __future__ import annotations
import os
import json
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any
import urllib.request
import urllib.parse
import urllib.error

from app.core.config import settings
from app.core.audit_logger import log_event

# Configuration defaults
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "balamuraleee@gmail.com")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "TABLEAU2PBI Workbench")

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "https://tdljizujlzbylsvdbjtu.supabase.co").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY")


def _users_db_path() -> Path:
    return settings.storage_root / "app_users.json"


def _read_local_users() -> dict[str, dict[str, Any]]:
    p = _users_db_path()
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_local_users(data: dict[str, dict[str, Any]]) -> None:
    p = _users_db_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with random 16-byte salt."""
    salt = secrets.token_bytes(16)
    iterations = 100_000
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${derived.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against stored PBKDF2 hash."""
    try:
        parts = hashed.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected = bytes.fromhex(parts[3])
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return secrets.compare_digest(actual, expected)
    except Exception:
        return False


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return f"{secrets.randbelow(900000) + 100000:06d}"


def send_otp_via_brevo(email: str, otp: str) -> dict[str, Any]:
    """Send 6-digit verification OTP email using Brevo REST API."""
    if not BREVO_API_KEY:
        log_event("EMAIL_OTP_SKIPPED", user_id=email, status="WARNING", details={"reason": "BREVO_API_KEY not configured"})
        return {"success": False, "error": "BREVO_API_KEY is not configured.", "dev_otp": otp}
    payload = {
        "sender": {
            "name": BREVO_SENDER_NAME,
            "email": BREVO_SENDER_EMAIL
        },
        "to": [{"email": email}],
        "subject": f"Your TABLEAU2PBI Verification OTP: {otp}",
        "htmlContent": f"""
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #08112F; margin: 0; font-size: 24px; letter-spacing: 0.05em;">TABLEAU2PBI</h2>
                <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Enterprise Migration Workbench</p>
            </div>
            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #e2e8f0;">
                <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">Your 6-digit one-time verification code is:</p>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #1e3a8a; background: #e0e7ff; padding: 12px 24px; border-radius: 8px; display: inline-block;">
                    {otp}
                </div>
                <p style="font-size: 12px; color: #64748b; margin: 16px 0 0;">This code is valid for 10 minutes. Do not share this code with anyone.</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">
                If you did not request this registration, please ignore this email.
            </p>
        </div>
        """
    }

    headers = {
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
        "accept": "application/json"
    }

    try:
        req = urllib.request.Request(
            BREVO_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status in (200, 201, 202):
                log_event("EMAIL_OTP_SENT", user_id=email, status="SUCCESS")
                return {"success": True, "message": "Email sent successfully"}
    except urllib.error.HTTPError as err:
        err_body = err.read().decode("utf-8", errors="replace")
        err_msg = err_body
        try:
            err_json = json.loads(err_body)
            err_msg = err_json.get("message", err_body)
        except Exception:
            pass
        log_event("EMAIL_OTP_FAILED", user_id=email, status="FAILED", details={"error": err_msg, "status_code": err.code})
        return {
            "success": False,
            "error": err_msg,
            "status_code": err.code,
            "dev_otp": otp
        }
    except Exception as exc:
        log_event("EMAIL_OTP_EXCEPTION", user_id=email, status="FAILED", details={"error": str(exc)})
        return {"success": False, "error": str(exc), "dev_otp": otp}


def get_user(email: str) -> dict[str, Any] | None:
    """Retrieve user record by email from Supabase or local persistent store."""
    email_clean = email.strip().lower()

    # Try Supabase if key is configured
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            url = f"{SUPABASE_URL}/rest/v1/app_users?email=eq.{urllib.parse.quote(email_clean)}&select=*"
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "accept": "application/json"
            }
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=5) as res:
                if res.status == 200:
                    rows = json.loads(res.read().decode("utf-8"))
                    if isinstance(rows, list) and len(rows) > 0:
                        return rows[0]
        except Exception:
            pass

    # Fallback to local store
    local_db = _read_local_users()
    return local_db.get(email_clean)


def upsert_user(email: str, fields: dict[str, Any]) -> dict[str, Any]:
    """Create or update user record in Supabase and local store."""
    email_clean = email.strip().lower()
    local_db = _read_local_users()
    user = local_db.get(email_clean, {
        "email": email_clean,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_verified": False,
        "role": "User"
    })
    user.update(fields)
    user["updated_at"] = datetime.now(timezone.utc).isoformat()
    local_db[email_clean] = user
    _write_local_users(local_db)

    # Sync with Supabase if configured
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            url = f"{SUPABASE_URL}/rest/v1/app_users"
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            }
            req = urllib.request.Request(
                url,
                data=json.dumps([user], default=str).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            urllib.request.urlopen(req, timeout=5)
        except Exception:
            pass

    return user
