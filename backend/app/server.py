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
        # For Azure AD tokens (both JWT and opaque), we validate via Azure's userinfo endpoint
        # This works regardless of token format
        headers = {"Authorization": f"Bearer {token}"}
        
        # Use Microsoft Graph to validate the token
        response = requests.get(
            "https://graph.microsoft.com/v1.0/me",
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            user_info = response.json()
            print(f"DEBUG: Token validated successfully for user: {user_info.get('userPrincipalName', 'Unknown')}")
            return token
        else:
            print(f"ERROR: Token validation failed. Status: {response.status_code}, Response: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Failed to validate token with Microsoft Graph: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed",
            headers={"WWW-Authenticate": "Bearer"},
        )
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
