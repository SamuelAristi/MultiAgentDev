"""
TikTok Script Models - Pydantic schemas for video script generation.
"""

from pydantic import BaseModel, Field


class Hook(BaseModel):
    """A hook for the first 0-3 seconds of the video."""

    text: str = Field(..., description="The hook text to grab attention")
    duration_seconds: float = Field(default=2.0, ge=0.5, le=3.0)
    style: str = Field(
        default="question",
        description="Hook style: question, statement, shock, curiosity",
    )


class TikTokScript(BaseModel):
    """Complete TikTok video script structure."""

    # Hooks (first 0-3 seconds - CRITICAL for retention)
    hooks: list[Hook] = Field(
        ...,
        min_length=1,
        max_length=3,
        description="1-3 hook options for the video opening",
    )

    # Body content (main message)
    body: str = Field(
        ...,
        min_length=50,
        max_length=500,
        description="Main content of the video script",
    )

    # Call to Action
    cta: str = Field(..., description="Clear call to action for viewers")

    # Metadata
    estimated_duration_seconds: int = Field(
        default=30, ge=15, le=60, description="Estimated video length"
    )
    trending_sounds_suggestion: list[str] = Field(
        default_factory=list, description="Suggested trending sounds/music"
    )
    hashtags: list[str] = Field(
        default_factory=list, max_length=10, description="Recommended hashtags"
    )


class TikTokScriptRequest(BaseModel):
    """Request for TikTok script generation."""

    topic: str = Field(..., min_length=3, description="Topic or product to create content about")
    target_audience: str | None = Field(None, description="Target audience description")
    tone: str = Field(
        default="engaging",
        description="Tone: engaging, funny, educational, dramatic, inspirational",
    )
    include_trends: bool = Field(default=True, description="Include trending elements")
