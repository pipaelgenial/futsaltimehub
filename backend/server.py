"""Futsal Time Hub Backend - FastAPI + MongoDB + JWT."""
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, List

from models import (
    UserCreate, UserLogin, UserOut, UserUpdate, PasswordReset, TokenResponse,
    TeamCreate, TeamOut,
    AthleteCreate, AthleteOut,
    MatchSave, MatchOut,
)
from auth import (
    hash_password,
    verify_password,
   )
import resend as resend_sdk
from pydantic import BaseModel, EmailStr


# ---------------- Setup ----------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Resend (email) — optional, only configured if API key present
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
EMAIL_FROM = os.environ.get("EMAIL_FROM", "onboarding@resend.dev").strip()
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").rstrip("/")
if RESEND_API_KEY:
    resend_sdk.api_key = RESEND_API_KEY

app = FastAPI(title="Futsal Time Hub API")
api_router = APIRouter(prefix="/api")

# Logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------------- Helpers ----------------

def _to_user_out(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": doc["_id"],
        "name": doc["name"],
        "email": doc["email"],
        "status": doc.get("status", "pending"),
        "is_admin": doc.get("is_admin", False),
        "created_at": doc.get("created_at", datetime.utcnow()),
    }


def _to_team_out(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": doc["_id"],
        "owner_id": doc["owner_id"],
        "name": doc["name"],
        "coach": doc.get("coach", ""),
        "color": doc.get("color", "#d4ff1a"),
        "created_at": doc.get("created_at", datetime.utcnow()),
    }


def _to_athlete_out(doc: dict) -> dict:
    return {
        "id": doc["_id"],
        "owner_id": doc["owner_id"],
        "number": doc["number"],
        "name": doc["name"],
        "position": doc["position"],
        "created_at": doc.get("created_at", datetime.utcnow()),
    }


def _to_match_out(doc: dict) -> dict:
    return {
        "id": doc["_id"],
        "owner_id": doc["owner_id"],
        "opponent": doc.get("opponent", ""),
        "competition": doc.get("competition", ""),
        "matchday": doc.get("matchday", ""),
        "venue": doc.get("venue", ""),
        "date": doc.get("date", ""),
        "team_name": doc.get("team_name", ""),
        "home_score": doc.get("home_score", 0),
        "away_score": doc.get("away_score", 0),
        "fouls_committed": doc.get("fouls_committed", 0),
        "fouls_suffered": doc.get("fouls_suffered", 0),
        "yellow_cards": doc.get("yellow_cards", 0),
        "red_cards": doc.get("red_cards", 0),
        "total_duration": doc.get("total_duration", 0),
        "half_reached": doc.get("half_reached", 1),
        "players": doc.get("players", []),
        "subs": doc.get("subs", []),
        "goals": doc.get("goals", []),
        "fouls": doc.get("fouls", []),
        "cards": doc.get("cards", []),
        "created_at": doc.get("created_at", datetime.utcnow()),
    }


# ---------------- Auth Dependency ----------------

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token em falta")
    token = authorization.split(" ", 1)[1]
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="Utilizador não encontrado")
    if user.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Conta não aprovada")
    return user


async def get_admin_user(current=Depends(get_current_user)) -> dict:
    if not current.get("is_admin"):
        raise HTTPException(status_code=403, detail="Apenas administradores")
    return current


# ---------------- Startup: seed admin ----------------

@app.on_event("startup")
async def seed_admin():
    """Create the default admin if no admin exists."""
    admin_email = "pedrompsantos84@gmail.com"
    existing = await db.users.find_one({"email": admin_email})

    if existing:
        await db.users.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "is_admin": True,
                    "status": "approved"
                }
            }
        )
        logger.info("Default admin already exists.")
        return

    import uuid

    admin_doc = {
        "_id": str(uuid.uuid4()),
        "name": "Pedro Santos",
        "email": admin_email,
        "password_hash": hash_password("amarense123"),
        "status": "approved",
        "is_admin": True,
        "created_at": datetime.utcnow(),
    }

    await db.users.insert_one(admin_doc)
    logger.info(f"Seeded default admin: {admin_email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ============================================================
# AUTH ROUTES
# ============================================================

@api_router.post("/auth/register", response_model=UserOut, status_code=201)
async def register(payload: UserCreate):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email já registado")
    import uuid
    user_doc = {
        "_id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "status": "pending",
        "is_admin": False,
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(user_doc)
    return _to_user_out(user_doc)


@api_router.post("/auth/login")
async def login(payload: UserLogin):
    print("LOGIN START")
    print("EMAIL:", payload.email)

    user = await db.users.find_one({"email": payload.email.lower()})
    print("USER:", user)

    if not user:
        raise HTTPException(status_code=401, detail="Email não registado")

    print("HAS PASSWORD:", "password_hash" in user)

    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Conta sem password definida")

    print("VERIFYING PASSWORD")

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Password incorreta")

    print("PASSWORD OK")

    token = create_access_token(user["_id"])

    print("TOKEN CREATED")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _to_user_out(user),
    }

@api_router.get("/auth/me", response_model=UserOut)
async def me(current=Depends(get_current_user)):
    return _to_user_out(current)


# ---------- Password reset ----------

class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str


def _send_reset_email(to_email: str, name: str, reset_link: str) -> bool:
    """Send password reset email via Resend. Returns True on success."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured; skipping email send")
        return False
    try:
        html = f"""
        <div style="font-family: -apple-system, Inter, sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px 24px;">
          <div style="max-width: 520px; margin: 0 auto;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
              <div style="width: 40px; height: 40px; background: #d4ff1a; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; color: #000; font-weight: 900;">⏱</div>
              <div>
                <div style="font-weight: 900; letter-spacing: 0.02em; text-transform: uppercase; font-size: 16px;">FUTSAL</div>
                <div style="font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #aaa;">Time Hub</div>
              </div>
            </div>
            <h1 style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; color: #fff; margin: 0 0 16px;">Repor Password</h1>
            <p style="color: #ccc; line-height: 1.6;">Olá <strong>{name}</strong>,</p>
            <p style="color: #ccc; line-height: 1.6;">Recebemos um pedido para repor a tua password no Futsal Time Hub. Clica no botão para criar uma nova:</p>
            <p style="margin: 32px 0;">
              <a href="{reset_link}" style="background: #d4ff1a; color: #000; padding: 14px 28px; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 4px; display: inline-block;">Repor Password</a>
            </p>
            <p style="color: #777; font-size: 12px; line-height: 1.6;">Este link é válido por 1 hora. Se não foste tu a solicitar, podes ignorar este email com segurança.</p>
            <hr style="border: none; border-top: 1px solid #222; margin: 32px 0 16px;">
            <p style="color: #555; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;">Futsal Time Hub · Criado por Pedro Pipa</p>
          </div>
        </div>
        """
        resend_sdk.Emails.send({
            "from": EMAIL_FROM,
            "to": to_email,
            "subject": "Repor Password — Futsal Time Hub",
            "html": html,
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send reset email to {to_email}: {e}")
        return False


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn):
    """Generates a reset token and emails the user. Always returns 200 to avoid leaking account existence."""
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if user and user.get("status") != "rejected":
        import uuid as _uuid
        from datetime import timedelta
        token = _uuid.uuid4().hex
        expires_at = datetime.utcnow() + timedelta(hours=1)
        await db.password_resets.insert_one({
            "_id": token,
            "user_id": user["_id"],
            "expires_at": expires_at,
            "created_at": datetime.utcnow(),
        })
        base_url = FRONTEND_URL or "https://futsal-timer-1.emergent.host"
        reset_link = f"{base_url}/reset-password?token={token}"
        sent = _send_reset_email(user["email"], user.get("name", "Treinador"), reset_link)
        logger.info(f"Password reset requested for {email} — email sent: {sent}")
    return {"ok": True, "message": "Se a conta existir, recebes um email com instruções."}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password mínima de 6 caracteres")
    record = await db.password_resets.find_one({"_id": payload.token})
    if not record:
        raise HTTPException(status_code=400, detail="Token inválido ou já usado")
    if record.get("expires_at") and record["expires_at"] < datetime.utcnow():
        await db.password_resets.delete_one({"_id": payload.token})
        raise HTTPException(status_code=400, detail="Token expirado. Pede novo email.")
    await db.users.update_one(
        {"_id": record["user_id"]},
        {"$set": {"password_hash": hash_password(payload.password)}}
    )
    await db.password_resets.delete_one({"_id": payload.token})
    return {"ok": True, "message": "Password atualizada com sucesso."}


# ============================================================
# ADMIN ROUTES
# ============================================================

@api_router.get("/admin/users", response_model=List[UserOut])
async def list_users(current=Depends(get_admin_user)):
    docs = await db.users.find().sort("created_at", -1).to_list(2000)
    return [_to_user_out(d) for d in docs]


@api_router.patch("/admin/users/{user_id}", response_model=UserOut)
async def patch_user(user_id: str, patch: UserUpdate, current=Depends(get_admin_user)):
    update_doc = {k: v for k, v in patch.dict(exclude_unset=True).items() if v is not None}
    if not update_doc:
        raise HTTPException(status_code=400, detail="Sem alterações")
    # Prevent self-demoting admin
    if user_id == current["_id"] and update_doc.get("is_admin") is False:
        raise HTTPException(status_code=400, detail="Não podes remover o teu próprio admin")
    result = await db.users.update_one({"_id": user_id}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    user = await db.users.find_one({"_id": user_id})
    return _to_user_out(user)


@api_router.delete("/admin/users/{user_id}", status_code=204)
async def remove_user(user_id: str, current=Depends(get_admin_user)):
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    if user.get("is_admin"):
        raise HTTPException(status_code=400, detail="Não podes eliminar um administrador")
    # Also clean up the user's data
    await db.users.delete_one({"_id": user_id})
    await db.teams.delete_many({"owner_id": user_id})
    await db.athletes.delete_many({"owner_id": user_id})
    await db.matches.delete_many({"owner_id": user_id})
    return None


@api_router.post("/admin/users/{user_id}/password", response_model=UserOut)
async def reset_password(user_id: str, payload: PasswordReset, current=Depends(get_admin_user)):
    new_hash = hash_password(payload.password)
    result = await db.users.update_one({"_id": user_id}, {"$set": {"password_hash": new_hash}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    user = await db.users.find_one({"_id": user_id})
    return _to_user_out(user)


# ============================================================
# TEAM ROUTES (user-scoped)
# ============================================================

@api_router.get("/team", response_model=Optional[TeamOut])
async def get_my_team(current=Depends(get_current_user)):
    team = await db.teams.find_one({"owner_id": current["_id"]})
    return _to_team_out(team) if team else None


@api_router.post("/team", response_model=TeamOut, status_code=201)
async def create_team(payload: TeamCreate, current=Depends(get_current_user)):
    existing = await db.teams.find_one({"owner_id": current["_id"]})
    if existing:
        # Update existing instead of creating duplicate
        await db.teams.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "name": payload.name.upper(),
                "coach": payload.coach or "",
                "color": payload.color or "#d4ff1a",
            }}
        )
        team = await db.teams.find_one({"_id": existing["_id"]})
        return _to_team_out(team)
    import uuid
    team_doc = {
        "_id": str(uuid.uuid4()),
        "owner_id": current["_id"],
        "name": payload.name.upper(),
        "coach": payload.coach or "",
        "color": payload.color or "#d4ff1a",
        "created_at": datetime.utcnow(),
    }
    await db.teams.insert_one(team_doc)
    return _to_team_out(team_doc)


@api_router.delete("/team", status_code=204)
async def delete_team(current=Depends(get_current_user)):
    await db.teams.delete_many({"owner_id": current["_id"]})
    await db.athletes.delete_many({"owner_id": current["_id"]})
    await db.matches.delete_many({"owner_id": current["_id"]})
    return None


# ============================================================
# ATHLETE ROUTES (user-scoped)
# ============================================================

@api_router.get("/athletes", response_model=List[AthleteOut])
async def list_athletes(current=Depends(get_current_user)):
    docs = await db.athletes.find({"owner_id": current["_id"]}).sort("number", 1).to_list(500)
    return [_to_athlete_out(d) for d in docs]


@api_router.post("/athletes", response_model=AthleteOut, status_code=201)
async def add_athlete(payload: AthleteCreate, current=Depends(get_current_user)):
    existing = await db.athletes.find_one({
        "owner_id": current["_id"],
        "number": payload.number,
    })
    if existing:
        raise HTTPException(status_code=409, detail=f"Número {payload.number} já em uso")
    import uuid
    doc = {
        "_id": str(uuid.uuid4()),
        "owner_id": current["_id"],
        "number": payload.number,
        "name": payload.name.strip(),
        "position": payload.position,
        "created_at": datetime.utcnow(),
    }
    await db.athletes.insert_one(doc)
    return _to_athlete_out(doc)


@api_router.delete("/athletes/{athlete_id}", status_code=204)
async def remove_athlete(athlete_id: str, current=Depends(get_current_user)):
    result = await db.athletes.delete_one({
        "_id": athlete_id,
        "owner_id": current["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    return None


# ============================================================
# MATCH ROUTES (user-scoped)
# ============================================================

@api_router.get("/matches", response_model=List[MatchOut])
async def list_matches(current=Depends(get_current_user)):
    docs = await db.matches.find({"owner_id": current["_id"]}).sort("created_at", -1).to_list(2000)
    return [_to_match_out(d) for d in docs]


@api_router.post("/matches", response_model=MatchOut, status_code=201)
async def save_match(payload: MatchSave, current=Depends(get_current_user)):
    import uuid
    doc = payload.dict()
    doc["_id"] = str(uuid.uuid4())
    doc["owner_id"] = current["_id"]
    doc["created_at"] = datetime.utcnow()
    await db.matches.insert_one(doc)
    return _to_match_out(doc)


@api_router.delete("/matches/{match_id}", status_code=204)
async def remove_match(match_id: str, current=Depends(get_current_user)):
    result = await db.matches.delete_one({
        "_id": match_id,
        "owner_id": current["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    return None


# ---------------- Health ----------------

@api_router.get("/")
async def root():
    return {"service": "Futsal Time Hub API", "status": "ok"}


# Health check (root-level) — required by Kubernetes readiness/liveness probes during deploy
@app.get("/health")
async def health():
    return {"status": "ok"}


# Include the router and CORS
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
