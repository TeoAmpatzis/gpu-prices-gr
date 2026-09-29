from dataclasses import dataclass, asdict


@dataclass
class Listing:
    """One product offer as seen on an aggregator. Mirrored in src/types.ts."""

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
