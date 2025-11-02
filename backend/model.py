from pydantic import BaseModel
from typing import Literal, List, Optional 

class VoiceInput(BaseModel):
    MDVP_Fhi_Hz_: float
    MDVP_Flo_Hz_: float
    MDVP_Jitter_: float
    MDVP_Jitter_Abs_: float
    MDVP_RAP: float
    MDVP_PPQ: float
    Jitter_DDP: float
    MDVP_Shimmer: float
    MDVP_Shimmer_dB_: float
    Shimmer_APQ3: float
    Shimmer_APQ5: float
    MDVP_APQ: float
    Shimmer_DDA: float
    NHR: float
    HNR: float
    RPDE: float
    DFA: float
    spread1: float
    spread2: float
    D2: float
    PPE: float

class KeyLogEntry(BaseModel):
    key: str
    hand: Literal["L","R"]
    timestamp: float
    holdTime: Optional[float] = None
    latency: Optional[float] = None
    direction: Optional[str] = None

class TypingInput(BaseModel):
    log: List[KeyLogEntry]
    gender: Literal["Male","Female"]