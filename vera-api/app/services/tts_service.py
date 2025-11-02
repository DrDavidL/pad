"""
Text-to-Speech service using ElevenLabs
"""
import os
import base64
from pathlib import Path
from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings

from app.core.config import get_settings

settings = get_settings()


class TTSService:
    """Service for text-to-speech generation"""

    def __init__(self):
        self.client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
        self.voice_id = settings.ELEVENLABS_VOICE_ID
        self.model_id = settings.ELEVENLABS_MODEL_ID
        # Use /tmp directory for cloud deployments (Railway, etc.)
        if os.environ.get("RAILWAY_ENVIRONMENT"):
            self.audio_dir = Path("/tmp/audio_files")
        else:
            self.audio_dir = Path("audio_files")
        self.audio_dir.mkdir(exist_ok=True)

    def generate_speech(
        self,
        text: str,
        voice_id: str = None,
        model_id: str = None
    ) -> tuple[str, bytes]:
        """
        Generate speech from text using ElevenLabs
        Returns (file_path, audio_bytes)
        """
        voice = voice_id or self.voice_id
        model = model_id or self.model_id

        try:
            response = self.client.text_to_speech.convert(
                voice_id=voice,
                output_format="mp3_22050_32",
                text=text,
                model_id=model,
                voice_settings=VoiceSettings(
                    stability=0.0,
                    similarity_boost=1.0,
                    style=0.0,
                    use_speaker_boost=True,
                ),
            )

            # Save to file
            import hashlib
            text_hash = hashlib.md5(text.encode()).hexdigest()[:10]
            filename = f"tts_{text_hash}.mp3"
            file_path = self.audio_dir / filename

            audio_data = b""
            with open(file_path, "wb") as f:
                for chunk in response:
                    if chunk:
                        f.write(chunk)
                        audio_data += chunk

            return str(file_path), audio_data

        except Exception as e:
            raise Exception(f"TTS generation failed: {str(e)}")

    def get_audio_base64(self, file_path: str) -> str:
        """Convert audio file to base64 for embedding"""
        with open(file_path, "rb") as f:
            audio_bytes = f.read()
        return base64.b64encode(audio_bytes).decode()

    def cleanup_old_files(self, max_age_hours: int = 24):
        """Delete audio files older than specified hours"""
        import time
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600

        for file_path in self.audio_dir.glob("*.mp3"):
            if current_time - file_path.stat().st_mtime > max_age_seconds:
                file_path.unlink()


# Singleton instance
tts_service = TTSService()
