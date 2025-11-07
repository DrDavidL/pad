"""
Chat and conversation endpoints
"""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from app.db.base import get_db
from app.models.database import ResearchID
from app.schemas.conversation import (
    MessageCreate,
    MessageResponse,
    ConversationHistoryRequest,
    ConversationHistoryResponse,
    StreamChatRequest
)
from app.core.security import get_current_user, verify_token
from app.services.llm_service import llm_service
from app.services.conversation_service import conversation_service
from app.services.tts_service import tts_service

# Import Vera's system prompt
from app.prompts import master_prompt, vera_first_message

router = APIRouter()


@router.post("/message", response_model=MessageResponse)
async def send_message(
    data: MessageCreate,
    current_user: ResearchID = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message and get response (non-streaming)
    """
    # Verify user matches research_id in request
    if current_user.research_id != data.research_id:
        raise HTTPException(status_code=403, detail="Research ID mismatch")

    # Save user message
    conversation_service.save_message(
        db=db,
        research_id=data.research_id,
        conversation_id=data.conversation_id,
        role="user",
        content=data.content
    )

    # Get conversation history for context
    messages, _ = conversation_service.get_conversation_history(
        db=db,
        research_id=data.research_id,
        conversation_id=data.conversation_id,
        limit=50
    )

    # Build message list for LLM
    llm_messages = [
        {"role": "system", "content": master_prompt}
    ]

    for msg in messages:
        if msg.role in ["user", "assistant"]:
            llm_messages.append({"role": msg.role, "content": msg.content})

    # Get LLM response
    response_text = await llm_service.get_chat_completion(
        model=data.model,
        messages=llm_messages
    )

    # Generate TTS audio
    audio_path = None
    try:
        audio_path, _ = tts_service.generate_speech(response_text)
    except Exception as e:
        print(f"TTS generation failed: {e}")

    # Save assistant message
    assistant_message = conversation_service.save_message(
        db=db,
        research_id=data.research_id,
        conversation_id=data.conversation_id,
        role="assistant",
        content=response_text,
        model_used=data.model,
        audio_url=audio_path
    )

    return MessageResponse(
        id=assistant_message.id,
        conversation_id=assistant_message.conversation_id,
        role=assistant_message.role,
        content=assistant_message.content,
        timestamp=assistant_message.timestamp,
        model_used=assistant_message.model_used,
        audio_url=assistant_message.audio_url
    )


@router.post("/history", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    data: ConversationHistoryRequest,
    current_user: ResearchID = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get conversation history for a research ID"""
    # Verify user matches research_id in request
    if current_user.research_id != data.research_id:
        raise HTTPException(status_code=403, detail="Research ID mismatch")

    messages, total = conversation_service.get_conversation_history(
        db=db,
        research_id=data.research_id,
        conversation_id=data.conversation_id,
        limit=data.limit,
        offset=data.offset
    )

    message_responses = [
        MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            role=msg.role,
            content=msg.content,
            timestamp=msg.timestamp,
            model_used=msg.model_used,
            audio_url=msg.audio_url
        )
        for msg in messages
    ]

    return ConversationHistoryResponse(
        messages=message_responses,
        total=total,
        research_id=data.research_id
    )


@router.get("/conversations")
async def get_recent_conversations(
    current_user: ResearchID = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """Get list of recent conversation IDs for current user"""
    conversations = conversation_service.get_recent_conversations(
        db=db,
        research_id=current_user.research_id,
        limit=limit
    )

    return {
        "research_id": current_user.research_id,
        "conversations": conversations
    }


@router.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    WebSocket endpoint for real-time streaming chat
    """
    await websocket.accept()

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message_data = json.loads(data)

            # Validate token
            token = message_data.get("token")
            if not token:
                await websocket.send_json({"error": "No token provided"})
                continue

            try:
                token_data = verify_token(token)
            except Exception as e:
                await websocket.send_json({"error": "Invalid token"})
                continue

            # Verify research ID matches
            if token_data.research_id != message_data.get("research_id"):
                await websocket.send_json({"error": "Research ID mismatch"})
                continue

            # Extract message details
            research_id = message_data.get("research_id")
            conversation_id = message_data.get("conversation_id")
            user_message = message_data.get("message")
            model = message_data.get("model", "gpt-4.1")

            # Save user message
            conversation_service.save_message(
                db=db,
                research_id=research_id,
                conversation_id=conversation_id,
                role="user",
                content=user_message
            )

            # Send acknowledgment
            await websocket.send_json({
                "type": "user_message_saved",
                "conversation_id": conversation_id
            })

            # Get conversation history
            messages, _ = conversation_service.get_conversation_history(
                db=db,
                research_id=research_id,
                conversation_id=conversation_id,
                limit=50
            )

            # Build LLM messages
            llm_messages = [
                {"role": "system", "content": master_prompt}
            ]

            for msg in messages:
                if msg.role in ["user", "assistant"]:
                    llm_messages.append({"role": msg.role, "content": msg.content})

            # Stream LLM response
            full_response = ""
            async for chunk in llm_service.stream_chat_completion(model, llm_messages):
                full_response += chunk
                await websocket.send_json({
                    "type": "chunk",
                    "content": chunk
                })

            # Send completion signal
            await websocket.send_json({
                "type": "complete",
                "full_response": full_response
            })

            # Generate TTS audio
            try:
                print(f"Generating TTS for response (length: {len(full_response)})")
                audio_path, audio_bytes = tts_service.generate_speech(full_response)
                audio_base64 = tts_service.get_audio_base64(audio_path)
                print(f"TTS generated successfully. Base64 length: {len(audio_base64)}")

                await websocket.send_json({
                    "type": "audio",
                    "audio_base64": audio_base64,
                    "audio_url": audio_path
                })
                print("Audio message sent to client")
            except Exception as e:
                print(f"TTS generation failed: {e}")
                import traceback
                traceback.print_exc()
                audio_path = None

            # Save assistant message
            conversation_service.save_message(
                db=db,
                research_id=research_id,
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
                model_used=model,
                audio_url=audio_path
            )

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.send_json({"error": str(e)})
