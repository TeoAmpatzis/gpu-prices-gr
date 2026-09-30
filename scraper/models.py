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
    memType: str | None  # GDDR7 | GDDR6X | GDDR6 | … ; None if not stated
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
    packaging: str | None  # Box | Tray; None if the title doesn't say
    igpu: bool  # integrated graphics (from the model number)
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
    cas: int | None  # CAS latency (CL30); None if not stated
    formFactor: str  # Desktop | Laptop | Server
    scrapedAt: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PsuListing:
    """One PSU offer as seen on an aggregator. Mirrored in src/types.ts (PsuListing)."""

    id: str
    source: str
    title: str
    url: str
    price: float
    shopCount: int | None
    brand: str  # vendor, e.g. "Corsair"; "Other" if unknown
    chip: str  # spec used as the model name, e.g. "850W Gold"
    watts: int
    efficiency: str | None  # Titanium | Platinum | Gold | Silver | Bronze | Diamond | Standard; None = uncertified
    modular: str | None  # Full | Semi | Non; None if unknown (BestPrice titles don't say)
    formFactor: str  # ATX | SFX | TFX | Flex
    scrapedAt: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class CaseListing:
    """One PC case offer as seen on an aggregator. Mirrored in src/types.ts (CaseListing)."""

    id: str
    source: str
    title: str
    url: str
    price: float
    shopCount: int | None
    brand: str  # vendor, e.g. "Lian Li"
    chip: str  # vendor + model name without colour, e.g. "Lian Li O11 Vision Compact"
    size: str  # Full Tower | Midi Tower | Mini Tower | SFF / Cube | Άλλο
    window: bool  # side window / tempered glass
    rgb: bool
    maxBoard: str | None  # largest motherboard it takes: E-ATX | ATX | Micro ATX | Mini ITX; None if not stated
    scrapedAt: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class FanListing:
    """One case-fan offer. Mirrored in src/types.ts (FanListing)."""

    id: str
    source: str
    title: str
    url: str
    price: float
    shopCount: int | None
    brand: str  # vendor
    chip: str  # vendor + model + size (+ pack), e.g. "Arctic P12 Pro 120mm ×3"
    size: int  # mm
    pack: int  # fans in the box
    rgb: bool
    pwm: bool  # 4-pin PWM speed control
    scrapedAt: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class CoolerListing:
    """One CPU cooler offer (air or AIO). Mirrored in src/types.ts (CoolerListing)."""

    id: str
    source: str
    title: str
    url: str
    price: float
    shopCount: int | None
    brand: str  # vendor
    chip: str  # vendor + model, e.g. "Arctic Liquid Freezer III Pro 360"
    type: str  # Air | AIO
    radiator: int | None  # AIO radiator length in mm (120…420); None for air
    rgb: bool
    scrapedAt: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class MoboListing:
    """One motherboard offer. Mirrored in src/types.ts (MoboListing)."""

    id: str
    source: str
    title: str
    url: str
    price: float
    shopCount: int | None
    brand: str  # vendor, e.g. "Asus"
    chip: str  # vendor + board name, e.g. "Asus TUF Gaming B850-Plus WiFi"
    chipset: str | None  # e.g. "B850", "X870E", "Z890"; None if the name has none (server boards)
    socket: str | None  # e.g. "AM5", "LGA1851", "sTR5"
    formFactor: str  # ATX | Micro ATX | Mini ITX | E-ATX | Άλλο
    memory: str | None  # DDR4 | DDR5; None if unknown (LGA1700 boards come in both)
    wifi: bool
    ramSlots: int | None  # DIMM slots (BestPrice filter slices; Mini ITX = 2); None if unknown
    scrapedAt: str

    def to_dict(self) -> dict:
        return asdict(self)
