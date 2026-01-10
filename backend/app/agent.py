from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.messages import AIMessage
from app.config import settings


prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a professional DevOps assistant. You provide accurate, technical, and helpful answers to DevOps related queries. You are concise but thorough."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])


if settings.GROQ_API_KEY:
    llm = ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model_name=settings.MODEL_NAME,
        temperature=0.7
    )

    chain = prompt | llm
else:

    from langchain_core.runnables import RunnableLambda
    def dummy_response(input_dict):
        return AIMessage(content="⚠️ **Configuration Error**: `GROQ_API_KEY` is missing. Please add it to `backend/.env` and restart the server.")
    
    chain = RunnableLambda(dummy_response)


store = {}

def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]


agent_with_chat_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="question",
    history_messages_key="history",
)

def get_agent():
    return agent_with_chat_history
