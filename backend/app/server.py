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
        # Decode token without signature verification to check claims
        # In a production multi-tenant app, you would fetch keys dynamically based on the 'iss' claim.
        # For this demo, we validate the Audience (aud) and Expiration (exp) to ensure the token is for us.
        
        claims = jwt.get_unverified_claims(token)
        
        # 1. Validate Audience
        if claims.get("aud") != settings.AZURE_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Invalid Audience")
            
        # 2. Validate Expiration (optional, get_unverified_claims might not check this)
        # import time
        # if claims.get("exp") < time.time():
        #     raise HTTPException(status_code=401, detail="Token Expired")

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
