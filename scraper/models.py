from dataclasses import dataclass, asdict


@dataclass
class Listing:
    """One GPU offer as seen on an aggregator. Mirrored in src/types.ts (GpuListing)."""

    id: str  # "<source>:<native id>"
    source: str  # "skroutz" | "bestprice"
    title: str
    url: str
    price: float  # EUR, lowest price the aggregator shows
    shopCount: int | None  # number of shops offering it (None if unknown)
    brand: str  # NVIDIA | AMD | Intel
    chip: str  # e.g. "RTX 5070 Ti", "RX 9070 XT", "Arc B580"
    vram: int  # GB
    partner: str  # board partner, e.g. "Asus"; "Other" if unknown
    scrapedAt: str  # ISO timestamp (UTC)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class CpuListing:
    """One CPU offer as seen on an aggregator. Mirrored in src/types.ts (CpuListing)."""

    id: str
    source: str
    title: str
    url: str
    price: float
    shopCount: int | None
    brand: str  # AMD | Intel
    chip: str  # e.g. "Ryzen 7 9800X3D", "Core Ultra 7 265K", "Xeon Silver 4309Y"
    cores: int | None
    socket: str | None  # e.g. "AM5", "LGA1851"
    scrapedAt: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class RamListing:
    """One RAM kit offer as seen on an aggregator. Mirrored in src/types.ts (RamListing)."""

    id: str
    source: str
    title: str
    url: str
    price: float
    shopCount: int | None
    brand: str  # vendor, e.g. "Kingston"; "Other" if unknown
    chip: str  # kit spec used as the model name, e.g. "DDR5 32GB (2×16GB) 6000MHz"
    type: str  # DDR2 | DDR3 | DDR4 | DDR5
    capacity: int  # total GB across modules
    modules: int
    speed: int | None  # MHz (MT/s)
    formFactor: str  # Desktop | Laptop | Server
    scrapedAt: str

    def to_dict(self) -> dict:
        return asdict(self)
