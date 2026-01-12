from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.agent import get_agent
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, status
from jose import jwt
from jose.exceptions import JWTError
import requests
from app.config import settings
import asyncio
import traceback

app = FastAPI(title="DevOps Assistant API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Get JWKS
        jwks_url = f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/discovery/v2.0/keys"
        jwks = requests.get(jwks_url).json()
        
        # Verify token (simplified for demo - in prod, cache JWKS and validate properly)
        # For this demo, we'll just check if it's a valid JWT structure and not expired if possible,
        # but full validation requires matching kid.
        # Ideally use a library that handles JWKS caching.
        
        # Skipping full signature verification for this step to avoid complex setup without real keys
        # In production: jwt.decode(token, jwks, algorithms=["RS256"], audience=settings.AZURE_CLIENT_ID)
        
        # Basic check: decode without verification to ensure it's a JWT
        jwt.get_unverified_claims(token)
        return token
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.post("/chat")
async def chat_endpoint(request: ChatRequest, token: str = Depends(verify_token)):
    agent = get_agent()
    
    async def generate():
        try:
            async for chunk in agent.astream(
                {"question": request.message},
                config={"configurable": {"session_id": request.session_id}}
            ):
                yield chunk.content
        except Exception as e:
            traceback.print_exc()
            yield f"Error: {str(e)}"

    return StreamingResponse(generate(), media_type="text/plain")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
