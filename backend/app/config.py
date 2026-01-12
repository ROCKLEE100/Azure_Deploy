from pydantic_settings import BaseSettings
from pathlib import Path
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import os


BACKEND_DIR = Path(__file__).parent.parent

class Settings(BaseSettings):
    GROQ_API_KEY: str
    MODEL_NAME: str = "llama-3.3-70b-versatile"
    AZURE_TENANT_ID: str = "common"
    AZURE_CLIENT_ID: str = "client-id"
    KEY_VAULT_NAME: str = ""
    
    class Config:
        env_file = str(BACKEND_DIR / ".env")
        env_file_encoding = 'utf-8'
        case_sensitive = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.KEY_VAULT_NAME and not self.GROQ_API_KEY:
            try:
                credential = DefaultAzureCredential()
                vault_url = f"https://{self.KEY_VAULT_NAME}.vault.azure.net/"
                client = SecretClient(vault_url=vault_url, credential=credential)
                self.GROQ_API_KEY = client.get_secret("groq-api-key").value
            except Exception as e:
                print(f"Warning: Failed to fetch secret from Key Vault: {e}")

settings = Settings()
