"""
LLM integration service - supports multiple providers
"""
from typing import List, Dict, Any, AsyncGenerator
from openai import OpenAI, AsyncOpenAI
from groq import Groq
import asyncio

from app.core.config import get_settings

settings = get_settings()


class LLMService:
    """Service for interacting with various LLM providers"""

    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.groq_client = Groq(api_key=settings.GROQ_API_KEY)

    def _get_client_and_config(self, model: str) -> tuple:
        """Get appropriate client and configuration for model"""
        groq_models = ["llama-3.3-70b-versatile", "gemma2-9b-it"]

        if model in groq_models:
            return "groq", self.groq_client, {"temperature": 0.5}
        elif model == "o3-mini":
            # o3-mini doesn't support temperature parameter
            return "openai", self.openai_client, {}
        else:
            # Default to OpenAI (gpt-4o, gpt-4o-mini, etc.)
            return "openai", self.openai_client, {"temperature": 0.5}

    async def stream_chat_completion(
        self,
        model: str,
        messages: List[Dict[str, Any]],
        max_tokens: int = 5000
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completion from LLM
        Yields text chunks as they arrive
        """
        provider, client, config = self._get_client_and_config(model)

        try:
            if provider == "openai":
                stream = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=max_tokens,
                    stream=True,
                    **config
                )

                async for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content

            elif provider == "groq":
                # Groq client is sync, run in executor
                loop = asyncio.get_event_loop()
                stream = await loop.run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model=model,
                        messages=messages,
                        max_tokens=max_tokens,
                        stream=True,
                        **config
                    )
                )

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content

        except Exception as e:
            yield f"Error: {str(e)}"

    async def get_chat_completion(
        self,
        model: str,
        messages: List[Dict[str, Any]],
        max_tokens: int = 5000
    ) -> str:
        """
        Get complete chat response (non-streaming)
        """
        full_response = ""
        async for chunk in self.stream_chat_completion(model, messages, max_tokens):
            full_response += chunk
        return full_response


# Singleton instance
llm_service = LLMService()
