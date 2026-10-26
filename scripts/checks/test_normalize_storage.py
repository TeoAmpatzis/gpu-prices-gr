"""Unit tests for scraper/normalize_storage.py (Q7, B9 grouping batch 2: storage model keys), with real shop titles
and URLs from main's data (87daea0 / 04ccfda). The model key is names.model_key(chip + " " + media), as
categories.py. settle() is the cross-listing step main.scrape_category runs before keys are used.
Run from the repo root: venv/Scripts/python scripts/checks/test_normalize_storage.py"""
import copy
import sys

sys.path.insert(0, "scraper")
import names  # noqa: E402
import normalize_storage  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def make(source, title, url):
    try:
        return normalize_storage.make_listing(source=source, native_id=str(abs(hash((title, url)))), title=title,
                                              url=url, price=100.0, shop_count=None,
                                              scraped_at="2026-10-25T00:00:00+00:00")
    except Exception as e:  # noqa: BLE001
        return f"ERROR {type(e).__name__}: {e}"


def get(l, f):
    return getattr(l, f) if hasattr(l, f) else l


def key_of(chip, media):
    return names.model_key(f"{chip} {media}")


def key(source, title, url):
    l = make(source, title, url)
    return key_of(l.chip, l.media) if hasattr(l, "chip") else l


def settled(rows):
    """[(source, title, url)] -> the listing dicts after settle(): [(chip, iface)]."""
    ls = [make(*r) for r in rows]
    if any(isinstance(l, str) for l in ls):
        return [l if isinstance(l, str) else l.chip for l in ls]
    dicts = [l.to_dict() for l in ls]
    try:
        normalize_storage.settle(dicts)
    except Exception as e:  # noqa: BLE001
        return f"ERROR {type(e).__name__}: {e}"
    return [(d["chip"], d["iface"]) for d in dicts]


# ---------- capacity: rounded data-centre sizes ----------
a = key("skroutz", "Kingston DC600M 1.9TB 2.5'' SEDC600M/1920G",
        "https://www.skroutz.gr/s/42347251/Kingston-DC600M-SSD-1-9TB-typou-2-5-me-syndesi-SATA-III-SEDC600M-1920G.html")
b = key("bestprice", 'Kingston DC600M SSD 1.92TB 2.5" Sata 3',
        "https://www.bestprice.gr/item/2158630041/kingston-dc600m-ssd-1-92tb-2-5-sata-3.html")
expect("1: Skroutz 1.9TB = BestPrice 1.92TB", a, b)
expect("1: chip Kingston DC600M 1.92TB", get(make("skroutz", "Kingston DC600M 1.9TB 2.5'' SEDC600M/1920G",
       "https://www.skroutz.gr/s/42347251/Kingston-DC600M-SSD-1-9TB-typou-2-5-me-syndesi-SATA-III-SEDC600M-1920G.html"),
       "chip"), "Kingston DC600M 1.92TB")
cap = lambda s, t, u: get(make(s, t, u), "capacity")
expect("2: 7.7TB -> 7680", cap("shopflix", "Kingston DC600M SSD Σκληρός Δίσκος 7.7TB 2.5'' SATA III",
       "https://shopflix.gr/p/SF-14101458/kingston-dc600m-ssd-skleros-diskos-7-7tb-2-5-sata-iii"), 7680)
expect("2: 7.68TB -> 7680", cap("eshop", "SSD KINGSTON SEDC600M/7680G DC600M ENTERPRISE CLASS MIXED USE 7.68TB 2.5'' SATA 3",
       "https://www.e-shop.gr/ssd-kingston-sedc600m-7680g-dc600m-enterprise-class-mixed-use-768tb-25-sata-3-p-PER.346835"), 7680)
expect("2: 7.6TB -> 7680", cap("shopflix", "Samsung PM9A3 SSD Σκληρός Δίσκος 7.6TB 2.5'' NVMe PCI Express 4.0",
       "https://shopflix.gr/p/SF-12496755/samsung-pm9a3-ssd-skleros-diskos-7-6tb-2-5-nvme-pci-express-4-0"), 7680)
expect("2: 15.4TB -> 15360", cap("skroutz", "Samsung PM1653 15.4TB 2.5'' MZILG15THBLA-00A07",
       "https://www.skroutz.gr/s/53467737/Samsung-PM1653-SSD-15-4TB-typou-2-5-me-syndesi-SAS-3-0-MZILG15THBLA-00A07-Bulk.html"), 15360)
expect("2: 30.7TB -> 30720", cap("bestprice", 'Kioxia CD8P-R SSD 30.7TB 2.5" NVMe PCI Express 5.0',
       "https://www.bestprice.gr/item/2160223541/kioxia-cd8p-r-ssd-30-7tb-2-5-nvme-pci-express-5-0.html"), 30720)
expect("3: 1920GB stays 1.92TB", get(make("snif", "KINGSTON SSD SEDC600M/1920G, 1920GB, SATA III, 2.5&amp;apos;&amp;apos;",
       "https://www.snif.gr/showproduct/34599687/kingston-ssd-sedc600m-1920g--1920gb--sata-iii--2-5"), "capacity"), 1920)
expect("3: 2048GB stays 2TB", cap("snif", 'Δίσκος SSD Kingston KC600 2.5" 2048GB SataIII SKC600/2048G',
       "https://www.snif.gr/showproduct/43318181/diskos-ssd-kingston-kc600-2-5--2048gb-sataiii-skc6"), 2000)
expect("3: 6.4TB stays", cap("skroutz", "Micron 9550 Max 6.4TB U.2 MTFDLAL6T4THB-1BK1DABYYR",
       "https://www.skroutz.gr/s/63151591/micron-9550-max-ssd-6-4tb-typou-u-2-me-syndesi-pci-express-5-0-mtfdlal6t4thb-1bk1dabyyr.html"), 6400)
expect("3: 30TB HDD stays", cap("skroutz", 'Seagate Exos M 30TB 3.5" 7200rpm ST30000NM004K',
       "https://www.skroutz.gr/s/61800218/seagate-exos-m-30tb-hdd-skliros-diskos-3-5-sata-iii-7200rpm-me-512mb-cache-gia-server-st30000nm004k.html"), 30000)
expect("3: 1.8TB HDD stays", cap("skroutz", 'Dell 1.8TB 2.5" 10000rpm RF9T8',
       "https://www.skroutz.gr/s/67044227/dell-1-8tb-hdd-skliros-diskos-2-5-sas-2-0-10000rpm-gia-server-rf9t8.html"), 1800)

# ---------- interface: SAS ----------
sas = make("skroutz", 'Seagate Exos 7E10 4TB 3.5" 7200rpm ST4000NM025B',
           "https://www.skroutz.gr/s/34591292/Seagate-Exos-7E10-4TB-HDD-Skliros-Diskos-3-5-SAS-3-0-7200rpm-me-256MB-Cache-gia-Server-ST4000NM025B.html")
expect("4: Exos SAS chip", get(sas, "chip"), "Seagate Exos 7E10 4TB SAS")
expect("4: Exos SAS iface", get(sas, "iface"), "SAS")
sata = make("shopflix", 'HDD Σκληρός Δίσκος Seagate Exos 7E10 4TB 3.5" SATA III 7200rpm για NAS / Server / Καταγραφικό',
            "https://shopflix.gr/p/SF-12332845/skliros-diskos-hdd-seagate-exos-7e10-4tb-35-sata-iii-7200rpm-gia-nas-server-katagrafiko-12307367")
expect("4: Exos SATA chip", get(sata, "chip"), "Seagate Exos 7E10 4TB")
expect("4: Exos SATA iface", get(sata, "iface"), "SATA")
hc330 = [key("bestprice", 'Western Digital Ultrastar DC HC330 SAS 10TB HDD Σκληρός Δίσκος 3.5" SAS',
             "https://www.bestprice.gr/item/2156170477/western-digital-ultrastar-dc-hc330-sas-10tb-hdd-skliros-diskos-3-5-sas.html"),
         key("eshop", "HDD WESTERN DIGITAL WUS721010AL5204 ULTRASTAR DC HC330 10TB 3.5'' SAS 12GB/S",
             "https://www.e-shop.gr/hdd-western-digital-wus721010al5204-ultrastar-dc-hc330-10tb-35-sas-12gb-s-p-PER.303282"),
         key("skroutz", 'Western Digital Ultrastar DC HC330 10TB 3.5" 7200rpm WUS721010AL5204 0B42258',
             "https://www.skroutz.gr/s/21183411/Western-Digital-Ultrastar-DC-HC330-10TB-HDD-Skliros-Diskos-3-5-SAS-3-0-7200rpm-gia-Server-WUS721010AL5204-0B42258.html")]
expect("5: HC330 SAS one key", len(set(hc330)), 1)
expect("5: HC330 key ends 10tbsashdd", str(hc330[0]).endswith("10tbsashdd"), True)
expect("5: SAS once in the name", get(make("bestprice", 'Western Digital Ultrastar DC HC330 SAS 10TB HDD Σκληρός Δίσκος 3.5" SAS',
       "https://www.bestprice.gr/item/2156170477/western-digital-ultrastar-dc-hc330-sas-10tb-hdd-skliros-diskos-3-5-sas.html"),
       "chip").upper().count("SAS"), 1)
pm1653 = [key("bestprice", 'Samsung PM1653 SSD 1.92TB 2.5" SAS 3',
              "https://www.bestprice.gr/item/2158625970/samsung-pm1653-ssd-1-92tb-2-5-sas-3.html"),
          key("shopflix", "SSD Samsung PM1653 1.9TB 2.5'' SAS 3.0", "https://shopflix.gr/p/SF-105431526/ssd-samsung-pm1653-1-9tb-2-5-sas-3-0")]
expect("6: PM1653 1.9 = 1.92 SAS", pm1653[0] == pm1653[1] and pm1653[0] == key_of("Samsung PM1653 1.92TB SAS", "SSD"), True)
expect("6: Kioxia PM7-R SAS from URL", get(make("skroutz", "Kioxia PM7-R 2.5''",
       "https://www.skroutz.gr/s/61857805/kioxia-pm7-r-ssd-1-9tb-typou-2-5-me-syndesi-sas-4-0-kpm7vrug1t92.html"), "chip"),
       "Kioxia PM7-R 1.92TB SAS")

# ---------- NVMe shape: U.2 ----------
u2a = make("skroutz", "Samsung PM9A3 960GB 2.5'' MZ-QL296000",
           "https://www.skroutz.gr/s/40965387/Samsung-PM9A3-SSD-960GB-typou-2-5-me-syndesi-PCI-Express-4-0-MZ-QL296000.html")
u2b = make("bestprice", "Samsung PM9A3 SSD 960GB U.2 NVMe PCI Express 4.0",
           "https://www.bestprice.gr/item/2158229029/samsung-pm9a3-ssd-960gb-u-2-nvme-pci-express-4-0.html")
m2 = make("bestprice", "Samsung PM9A3 SSD 960GB M.2 NVMe PCI Express 4.0",
          "https://www.bestprice.gr/item/2157610190/samsung-pm9a3-ssd-960gb-m-2-nvme-pci-express-4-0.html")
expect("7: 2.5'' NVMe = U.2", (get(u2a, "chip"), get(u2a, "formFactor")), ("Samsung PM9A3 960GB U.2", "U.2"))
expect("7: U.2 chip", get(u2b, "chip"), "Samsung PM9A3 960GB U.2")
expect("7: M.2 stays", (get(m2, "chip"), get(m2, "formFactor")), ("Samsung PM9A3 960GB", "M.2 2280"))
mu = make("skroutz", "Micron 7450 Pro 3.8TB 2.5'' MTFDKCB3T8TFR-1BC1ZABYYR",
          "https://www.skroutz.gr/s/40077199/Micron-7450-Pro-SSD-3-8TB-typou-2-5-me-syndesi-PCI-Express-4-0-MTFDKCB3T8TFR-1BC1ZABYYR.html")
mm = make("bestprice", "Micron 7450 Pro SSD 3.8TB M.2 NVMe PCI Express 4.0",
          "https://www.bestprice.gr/item/2159156261/micron-7450-pro-ssd-3-8tb-m-2-nvme-pci-express-4-0.html")
expect("8: Micron U.2", (get(mu, "chip"), get(mu, "tier")), ("Micron 7450 Pro 3.84TB U.2", "Server"))
expect("8: Micron M.2 Server", (get(mm, "chip"), get(mm, "tier")), ("Micron 7450 Pro 3.84TB", "Server"))
pc = make("skroutz", "Samsung PM9D3a 960GB PCle Card MZWL6960HFJA-00AW7",
          "https://www.skroutz.gr/s/65111414/samsung-pm9d3a-ssd-960gb-typou-pcle-card-me-syndesi-pci-express-5-0-mzwl6960hfja-00aw7-bulk.html")
expect("9: PM9D3a card Server, no suffix", (get(pc, "chip"), get(pc, "tier")), ("Samsung PM9D3a 960GB", "Server"))
pm893 = make("bestprice", 'Samsung PM893 SSD 1.92TB 2.5" Sata 3', "https://www.bestprice.gr/item/2157594666/samsung-pm893-ssd-1-92tb-2-5-sata-3.html")
expect("10: SATA SSD keeps 2.5\"", (get(pm893, "chip"), get(pm893, "formFactor")), ("Samsung PM893 1.92TB", '2.5"'))
ad25 = make("shopflix", "Adata Legend 860 SSD Σκληρός Δίσκος 500GB 2.5'' PCI Express 4.0",
            "https://shopflix.gr/p/SF-104720440/adata-legend-860-ssd-skleros-diskos-500gb-2-5-pci-express-4-0")
adm2 = make("bestprice", "Adata Legend 860 SSD 500GB M.2 NVMe PCI Express 4.0",
            "https://www.bestprice.gr/item/2160279636/adata-legend-860-ssd-500gb-m-2-nvme-pci-express-4-0.html")
expect("10: Adata 2.5'' NVMe -> own U.2 model", (get(ad25, "chip"), get(ad25, "tier")), ("Adata Legend 860 500GB U.2", "Server"))
expect("10: Adata M.2 Consumer", (get(adm2, "chip"), get(adm2, "tier")), ("Adata Legend 860 500GB", "Consumer"))

# ---------- HDD shape ----------
t18 = make("skroutz", 'Toshiba Enterprise HDD 1.8TB 2.5" 10000rpm AL14SEB18EQ', "https://www.skroutz.gr/s/19004475/Toshiba-Enterprise-HDD-1-8TB.html")
t180 = make("skroutz", 'Toshiba Enterprise 18TB 3.5" 7200rpm MG09SCA18TE',
            "https://www.skroutz.gr/s/31653060/Toshiba-Enterprise-18TB-HDD-Skliros-Diskos-3-5-SAS-3-0-7200rpm-me-512MB-Cache-gia-Server-MG09SCA18TE.html")
expect("11: 1.8TB is a 2.5\" drive", get(t18, "formFactor"), '2.5"')
expect("11: 1.8TB (10k, no interface word) = SAS", get(t18, "chip"), 'Toshiba Enterprise 1.8TB 2.5" SAS')
expect("11: 18TB SAS", get(t180, "chip"), "Toshiba Enterprise 18TB SAS")
expect("11: keys differ", key_of(get(t18, "chip"), "HDD") != key_of(get(t180, "chip"), "HDD"), True)
begi = [make("bestprice", "Dell 400-BEGI 2.4TB HDD Σκληρός Δίσκος SAS 3 10000rpm",
             "https://www.bestprice.gr/item/2158372623/dell-400-begi-2-4tb-hdd-skliros-diskos-sas-3-10000rpm.html"),
        make("skroutz", 'Dell 2.4TB 2.5" 10000rpm 400-BEGI',
             "https://www.skroutz.gr/s/38620982/Dell-2-4TB-HDD-Skliros-Diskos-2-5-SAS-3-0-10000rpm-gia-Server-400-BEGI.html")]
expect("12: Dell 400-BEGI one model", [get(x, "chip") for x in begi], ['Dell 400-BEGI 2.4TB 2.5" SAS'] * 2)
mg = make("eshop", "HDD TOSHIBA MG10ACA20TE MG10 SERIES 20TB 7200RPM 512CACHE",
          "https://www.e-shop.gr/hdd-toshiba-mg10aca20te-mg10-series-20tb-7200rpm-512cache-p-PER.306498")
expect("12: 7200rpm with no size stays 3.5\"", get(mg, "formFactor"), '3.5"')

# ---------- owner's rule 2: an interface no word states is unknown, not SATA ----------
expect("R2: no interface anywhere -> None", get(mg, "iface"), None)
mc = make("shopflix", 'HDD Σκληρός Δίσκος HP Mission Critical 2.4TB 3.5" SATA III 10000rpm για Server',
          "https://shopflix.gr/p/SF-105214334/hdd-skliros-diskos-hp-mission-critical-2-4tb-3-5-sata-iii-10000rpm-gia-server")
expect("R2: SATA in the title beats 10k rpm", (get(mc, "chip"), get(mc, "iface")), ("HP Mission Critical 2.4TB", "SATA"))
w127 = make("skroutz", 'HP Enterprise 600GB 2.5" 10000rpm W127122198',
            "https://www.skroutz.gr/s/67040540/hp-enterprise-600gb-hdd-skliros-diskos-2-5-sata-iii-10000rpm-gia-server-w127122198.html")
expect("R2: 10k rpm, SATA only in Skroutz's URL -> SAS", (get(w127, "chip"), get(w127, "iface")),
       ('HP Enterprise 600GB 2.5" SAS', "SAS"))

# The 14 models of 87daea0 whose non-SAS listings never say SATA in their title.
FOURTEEN = {
    "Dell 161-BCBC 2TB": ([("bestprice", 'Dell 161-BCBC 2TB HDD Σκληρός Δίσκος 3.5" SAS 7200rpm',
                            "https://www.bestprice.gr/item/2158333221/dell-161-bcbc-2tb-hdd-skliros-diskos-3-5-sas-7200rpm.html"),
                           ("skroutz", 'Dell 2TB 3.5" 7200rpm 161-BCBC',
                            "https://www.skroutz.gr/s/41662494/Dell-2TB-HDD-Skliros-Diskos-3-5-SATA-III-7200rpm-gia-Desktop-161-BCBC.html")],
                          ["Dell 161-BCBC 2TB SAS"] * 2),
    "Dell 161-BCFV 2.4TB": ([("bestprice", 'Dell 161-BCFV 2.4TB HDD Σκληρός Δίσκος 3.5" SAS 10000rpm',
                              "https://www.bestprice.gr/item/2159034678/dell-161-bcfv-2-4tb-hdd-skliros-diskos-3-5-sas-10000rpm.html"),
                             ("skroutz", 'Dell 2.4TB 3.5" 10000rpm 161-BCFV',
                              "https://www.skroutz.gr/s/46476524/Dell-2-4TB-HDD-Skliros-Diskos-3-5-SATA-III-10000rpm-gia-Server-161-BCFV.html")],
                            ["Dell 161-BCFV 2.4TB SAS"] * 2),
    "Dell 161-BCHF 2.4TB": ([("bestprice", 'Dell 161-BCHF 2.4TB HDD Σκληρός Δίσκος 2.5" SAS 10000rpm',
                              "https://www.bestprice.gr/item/2159142048/dell-161-bchf-2-4tb-hdd-skliros-diskos-2-5-sas-10000rpm.html"),
                             ("skroutz", 'Dell 2.4TB 2.5" 10000rpm 161-BCHF',
                              "https://www.skroutz.gr/s/46776544/Dell-2-4TB-HDD-Skliros-Diskos-2-5-SATA-III-10000rpm-gia-Server-161-BCHF.html")],
                            ['Dell 161-BCHF 2.4TB 2.5" SAS'] * 2),
    "Dell 400-ASGS 600GB": ([("skroutz", 'Dell 600GB 2.5" 10000rpm 400-ASGS',
                              "https://www.skroutz.gr/s/67042320/dell-600gb-hdd-skliros-diskos-2-5-sata-iii-10000rpm-gia-server-400-asgs.html"),
                             ("skroutz", 'Dell 600GB 2.5" 10000rpm 400-ASGS',
                              "https://www.skroutz.gr/s/49710924/Dell-600GB-HDD-Skliros-Diskos-2-5-SAS-3-0-10000rpm-gia-Server-400-ASGS.html"),
                             ("bestprice", 'Dell 400-ASGS 600GB HDD Σκληρός Δίσκος 2.5" SAS 3.0 10000rpm 400-ASGS',
                              "https://www.bestprice.gr/item/2164559253/dell-400-asgs-600gb-hdd-skliros-diskos-2-5-sas-3-0-10000rpm-400-asgs.html")],
                            ['Dell 400-ASGS 600GB 2.5" SAS'] * 3),
    "Dell 400-ATJM 1.2TB": ([("skroutz", 'Dell 1.2TB 2.5" 10000rpm 400-ATJM', "https://www.skroutz.gr/s/17095108/Dell-400-ATJM-1-2TB.html"),
                             ("bestprice", 'Dell 400-ATJM 1.2TB HDD Σκληρός Δίσκος 2.5" SAS 3 10000rpm',
                              "https://www.bestprice.gr/item/2155486201/dell-400-atjm-1-2tb-hdd-skliros-diskos-2-5-sas-3-10000rpm.html")],
                            ['Dell 400-ATJM 1.2TB 2.5" SAS'] * 2),
    # 819203-B21 is a SATA drive (Skroutz's URL says so) and shares no part number with the SAS listing: stays apart.
    "HP Business Critical 8TB": ([("skroutz", 'HP Business Critical 8TB 3.5" 7200rpm 819203-B21',
                                   "https://www.skroutz.gr/s/38314124/HP-Business-Critical-8TB-HDD-Skliros-Diskos-3-5-SATA-III-7200rpm-gia-Server-819203-B21.html"),
                                  ("skroutz", 'HP Business Critical 8TB 3.5" 7200rpm',
                                   "https://www.skroutz.gr/s/58851113/HP-Business-Critical-8TB-HDD-Skliros-Diskos-3-5-SAS-3-0-7200rpm-gia-Server.html")],
                                 ["HP Business Critical 8TB", "HP Business Critical 8TB SAS"]),
    # 695510-B21: no interface anywhere, 7200 rpm, a part number no SAS listing has: unknown, stays apart.
    "HP Enterprise 4TB": ([("skroutz", 'HP Enterprise 4TB 3.5" 7200rpm 695510-B21', "https://www.skroutz.gr/s/8652106/HP-Enterprise-LFF-SC-4TB.html"),
                           ("skroutz", 'HP Enterprise 4TB 3.5" 7200rpm 713831-B21',
                            "https://www.skroutz.gr/s/49697595/HP-Enterprise-4TB-HDD-Skliros-Diskos-3-5-SAS-3-0-7200rpm-gia-Server-713831-B21.html"),
                           ("shopflix", 'HP Enterprise 4TB HDD Σκληρός Δίσκος 3.5" SAS 3.0 7200rpm για Server',
                            "https://shopflix.gr/p/SF-200218982/hp-enterprise-4tb-hdd-skleros-diskos-3-5-sas-3-0-7200rpm-gia-server")],
                          ["HP Enterprise 4TB", "HP Enterprise 4TB SAS", "HP Enterprise 4TB SAS"]),
    "HP Enterprise 600GB 2.5\"": ([("skroutz", 'HP Enterprise 600GB 2.5" 10000rpm W127122198',
                                    "https://www.skroutz.gr/s/67040540/hp-enterprise-600gb-hdd-skliros-diskos-2-5-sata-iii-10000rpm-gia-server-w127122198.html"),
                                   ("skroutz", 'HP Enterprise 600GB 2.5" 15000rpm 759212-B21', "https://www.skroutz.gr/s/8443923/HP-SC-Enterprise-600GB.html"),
                                   ("shopflix", 'HP Enterprise 600GB HDD Σκληρός Δίσκος 2.5" SAS 2.0 10000rpm για Server',
                                    "https://shopflix.gr/p/SF-200093881/hp-enterprise-600gb-hdd-skleros-diskos-2-5-sas-2-0-10000rpm-gia-server")],
                                  ['HP Enterprise 600GB 2.5" SAS'] * 3),
    "HP Enterprise 600GB 3.5\"": ([("skroutz", 'HP Enterprise 600GB 3.5" 10000rpm W127122027',
                                    "https://www.skroutz.gr/s/67041002/hp-enterprise-600gb-hdd-skliros-diskos-3-5-sata-iii-10000rpm-gia-server-w127122027.html"),
                                   ("skroutz", 'HP Enterprise 600GB 3.5" 15000rpm 832975-001',
                                    "https://www.skroutz.gr/s/51220915/HP-600GB-HDD-Skliros-Diskos-3-5-SAS-3-0-15000rpm-gia-Server-832975-001.html")],
                                  ["HP Enterprise 600GB SAS"] * 2),
    "Lenovo 00WG700 1.2TB": ([("skroutz", 'Lenovo 1.2TB 2.5" 10000rpm 00WG700', "https://www.skroutz.gr/s/19179449/Lenovo-00WG700-1-2TB.html"),
                              ("bestprice", 'Lenovo 00WG700 1.2TB HDD Σκληρός Δίσκος 2.5" SAS 3 10000rpm',
                               "https://www.bestprice.gr/item/2155029542/lenovo-00wg700-1-2tb-hdd-skliros-diskos-2-5-sas-3-10000rpm.html")],
                             ['Lenovo 00WG700 1.2TB 2.5" SAS'] * 2),
    "Lenovo ThinkSystem 2.4TB": ([("skroutz", 'Lenovo ThinkSystem 2.4TB 2.5" 10000rpm 4XB7A83970',
                                   "https://www.skroutz.gr/s/50445484/Lenovo-ThinkSystem-2-4TB-HDD-Skliros-Diskos-2-5-SAS-3-0-10000rpm-gia-Server-4XB7A83970.html"),
                                  ("skroutz", 'Lenovo ThinkSystem 2.4TB 2.5" 10000rpm OK-262-27-LVSH24E 4XB7A83970',
                                   "https://www.skroutz.gr/s/55410208/Lenovo-ThinkSystem-2-4TB-HDD-Skliros-Diskos-2-5-SATA-III-10000rpm-gia-Server-OK-262-27-LVSH24E-4XB7A83970.html"),
                                  ("shopflix", 'Lenovo ThinkSystem 2.4TB HDD Σκληρός Δίσκος 2.5" SAS 3.0 10000rpm',
                                   "https://shopflix.gr/p/SF-103507333/lenovo-thinksystem-2-4tb-hdd-skliros-diskos-2-5-sas-3-0-10000rpm")],
                                 ['Lenovo ThinkSystem 2.4TB 2.5" SAS'] * 3),
    "Toshiba Enterprise 1.8TB / 18TB": ([("skroutz", 'Toshiba Enterprise HDD 1.8TB 2.5" 10000rpm AL14SEB18EQ',
                                          "https://www.skroutz.gr/s/19004475/Toshiba-Enterprise-HDD-1-8TB.html"),
                                         ("skroutz", 'Toshiba Enterprise 18TB 3.5" 7200rpm MG09SCA18TE',
                                          "https://www.skroutz.gr/s/31653060/Toshiba-Enterprise-18TB-HDD-Skliros-Diskos-3-5-SAS-3-0-7200rpm-me-512MB-Cache-gia-Server-MG09SCA18TE.html")],
                                        ['Toshiba Enterprise 1.8TB 2.5" SAS', "Toshiba Enterprise 18TB SAS"]),
    # MG10ACA20TE is the SATA MG10 (ACA); no interface word, 7200 rpm, no shared part number: stays apart.
    "Toshiba MG10 20TB": ([("eshop", "HDD TOSHIBA MG10ACA20TE MG10 SERIES 20TB 7200RPM 512CACHE",
                            "https://www.e-shop.gr/hdd-toshiba-mg10aca20te-mg10-series-20tb-7200rpm-512cache-p-PER.306498"),
                           ("skroutz", 'Toshiba MG10 20TB 3.5" 7200rpm MG10SCA20TE',
                            "https://www.skroutz.gr/s/66262542/toshiba-mg10-20tb-hdd-skliros-diskos-3-5-sas-3-0-7200rpm-me-512mb-cache-gia-server-katagrafiko-mg10sca20te.html")],
                          ["Toshiba MG10 20TB", "Toshiba MG10 20TB SAS"]),
    # 0B35950 is the SATA HC310 (Skroutz's URL says SATA): stays apart.
    "WD Ultrastar DC HC310 4TB": ([("skroutz", 'Western Digital Ultrastar DC HC310 4TB 3.5" 7200rpm 0B35950 HC310',
                                    "https://www.skroutz.gr/s/26969961/Western-Digital-Ultrastar-DC-HC310-4TB-HDD-Skliros-Diskos-3-5-SATA-III-7200rpm-me-256MB-Cache-gia-Server-0B35950-HC310.html"),
                                   ("skroutz", 'Western Digital Ultrastar DC HC310 4TB 3.5" 7200rpm 0B36048',
                                    "https://www.skroutz.gr/s/18549557/Western-Digital-Ultrastar-DC-HC310-4TB-HDD-Skliros-Diskos-3-5-SAS-3-0-7200rpm-me-256MB-Cache-gia-Server-0B36048.html")],
                                  ["Western Digital Ultrastar DC HC310 4TB", "Western Digital Ultrastar DC HC310 4TB SAS"]),
}
for name, (rows, want) in FOURTEEN.items():
    got = settled(rows)
    expect(f"R2/14: {name}", [g[0] if isinstance(g, tuple) else g for g in got] if isinstance(got, list) else got, want)

# The same part number in a title that says SATA keeps a 10k/15k drive (SAS only by rpm) with it: one drive.
SAME_PART = {
    "CoreParts SA600005I404": ([("skroutz", 'CoreParts 600GB 3.5" 15000rpm SA600005I404',
                                 "https://www.skroutz.gr/s/49676715/CoreParts-600GB-HDD-Skliros-Diskos-3-5-SATA-III-15000rpm-gia-Server-SA600005I404.html"),
                                ("shopflix", 'CoreParts SA600005I404 600GB HDD Σκληρός Δίσκος 3.5" SATA III 15000rpm για Server',
                                 "https://shopflix.gr/p/SF-200140883/coreparts-sa600005i404-600gb-hdd-skleros-diskos-3-5-sata-iii-15000rpm-gia-server")],
                               ["CoreParts SA600005I404 600GB"] * 2),
    "HP Msa W127213608": ([("skroutz", 'HP Msa 1.2TB 2.5" 10000rpm W127213608',
                            "https://www.skroutz.gr/s/67044225/hp-msa-1-2tb-hdd-skliros-diskos-2-5-sata-iii-10000rpm-gia-server-w127213608.html"),
                           ("shopflix", 'HP Msa 1.2TB HDD Σκληρός Δίσκος 2.5" SATA III 10000rpm για Server W127213608',
                            "https://shopflix.gr/p/SF-201540172/hp-msa-1-2tb-hdd-skleros-diskos-2-5-sata-iii-10000rpm-gia-server-w127213608")],
                          ['HP Msa 1.2TB 2.5"'] * 2),
}
for name, (rows, want) in SAME_PART.items():
    got = settled(rows)
    expect(f"R2/same part: {name}", [g[0] if isinstance(g, tuple) else g for g in got] if isinstance(got, list) else got, want)

# settle(): a part number shared with a SAS listing moves an unknown-interface listing; idempotent; reversible.
rows = FOURTEEN["Dell 161-BCBC 2TB"][0]
dicts = [make(*r).to_dict() for r in rows] if not isinstance(make(*rows[0]), str) else []
if dicts and hasattr(normalize_storage, "settle"):
    normalize_storage.settle(dicts)
    once = copy.deepcopy(dicts)
    normalize_storage.settle(dicts)
    expect("settle: twice = once", dicts, once)
    expect("settle: moved listing's iface", dicts[1]["iface"], "SAS")
    alone = [copy.deepcopy(dicts[1])]  # the SAS listing has gone (a later run): the Skroutz one goes back
    normalize_storage.settle(alone)
    expect("settle: reversible", (alone[0]["chip"], alone[0]["iface"]), ("Dell 161-BCBC 2TB", "SATA"))
else:
    expect("settle exists", hasattr(normalize_storage, "settle"), True)
# A "12GB/S" speed token is not a part number to match on.
expect("settle: 12GB/S is no part number", normalize_storage._part_numbers("HDD WESTERN DIGITAL ULTRASTAR DC HC555 12TB 3.5'' SAS 12GB/S 0B47741")
       if hasattr(normalize_storage, "_part_numbers") else "missing", {"0B47741"})

# ---------- fix round 1 (review-1.md I1, I2, I3/I5/I6, I7) ----------
def settle_dicts(dicts):
    try:
        normalize_storage.settle(dicts)
    except Exception as e:  # noqa: BLE001
        return f"ERROR {type(e).__name__}: {e}"
    return [(d["chip"], d["iface"]) for d in dicts]


def dicts_of(rows):
    ls = [make(*r) for r in rows]
    return [l.to_dict() for l in ls] if all(hasattr(l, "to_dict") for l in ls) else None


def chips(got):
    return [c for c, _ in got] if isinstance(got, list) else got


# I1: the SATA-titled listing demotes the rpm-only SAS one; a third listing with no interface word and the same part
# number must not join SAS (the demoted listing counts as SATA): one drive, one model. Twice = once.
CORE3 = [("shopflix", 'CoreParts SA600005I404 600GB HDD Σκληρός Δίσκος 3.5" SATA III 15000rpm για Server',
          "https://shopflix.gr/p/SF-200140883/coreparts-sa600005i404-600gb-hdd-skleros-diskos-3-5-sata-iii-15000rpm-gia-server"),
         ("skroutz", 'CoreParts 600GB 3.5" 15000rpm SA600005I404',
          "https://www.skroutz.gr/s/49676715/CoreParts-600GB-HDD-Skliros-Diskos-3-5-SATA-III-15000rpm-gia-Server-SA600005I404.html"),
         ("eshop", 'CoreParts SA600005I404 600GB HDD 3.5"', "https://www.e-shop.gr/coreparts-sa600005i404-600gb-hdd-35-p-PER.999001")]
d3 = dicts_of(CORE3)
first = settle_dicts(d3) if d3 else "make failed"
expect("I1: 3-listing CoreParts = one model", chips(first), ["CoreParts SA600005I404 600GB"] * 3)
second = settle_dicts(d3) if d3 else "make failed"
expect("I1: settle twice = once (3 listings)", second, first)
# The SATA-titled listing has gone (a later run): the kept, demoted Skroutz listing goes back to SAS (rpm rule) and
# the unknown one follows it by the part number.
kept = [copy.deepcopy(d) for d in d3[1:]] if d3 else []
expect("I1: kept demoted listing (input)", [d["chip"] for d in kept], ["CoreParts SA600005I404 600GB"] * 2)
expect("I1: reversal once the SATA listing is gone", chips(settle_dicts(kept)) if kept else "make failed",
       ["CoreParts SA600005I404 600GB SAS"] * 2)
expect("I1: reversed listings are Server", [d["tier"] for d in kept], ["Server"] * 2)
# And back again when it returns (from the reversed state).
back = [copy.deepcopy(d3[0])] + kept if d3 else []
expect("I1: and back when the SATA listing returns", chips(settle_dicts(back)) if back else "make failed",
       ["CoreParts SA600005I404 600GB"] * 3)

# I2: cache sizes, inch words, speeds and Greek-glued tokens are never part numbers.
expect("I2: 512CACHE", normalize_storage._part_numbers("HDD TOSHIBA MG10ACA20TE MG10 SERIES 20TB 7200RPM 512CACHE"),
       {"MG10ACA20TE"})
expect("I2: 256MBCACHE / 2.5INCHES / 6GB/S / Greek", normalize_storage._part_numbers(
       "HDD SEAGATE ST600MM0099 600GB 2.5INCHES 256MBCACHE 6GB/S ΔΊΣΚΟΣM.2NVME256GB"), {"ST600MM0099"})
MG10 = [("eshop", "HDD TOSHIBA MG10ACA20TE MG10 SERIES 20TB 7200RPM 512CACHE",
         "https://www.e-shop.gr/hdd-toshiba-mg10aca20te-mg10-series-20tb-7200rpm-512cache-p-PER.306498"),
        ("eshop", "HDD TOSHIBA MG10SCA20TE MG10 SERIES 20TB 7200RPM 512CACHE SAS",
         "https://www.e-shop.gr/hdd-toshiba-mg10sca20te-mg10-series-20tb-7200rpm-512cache-sas-p-PER.999002")]
expect("I2: SATA MG10ACA20TE stays apart from its SAS twin", chips(settled(MG10)),
       ["Toshiba MG10 20TB", "Toshiba MG10 20TB SAS"])

# I3 / I5 / I6: the part-number join also links a listing to the U.2 model of its drive.
PM9A3 = [("eshop", "SSD SAMSUNG PM9A3 1.92TB PCIE GEN4 X4 NVME 2.5 INCH U.2 DATA CENTER MZQL21T9HCJR-00W07",
          "https://www.e-shop.gr/ssd-samsung-pm9a3-192tb-pcie-gen4-x4-nvme-25-inch-u2-data-center-mzql21t9hcjr-00w07-p-PER.306573"),
         ("bestprice", "Samsung PM9A3 SSD 1.92TB U.2 NVMe PCI Express 4.0",
          "https://www.bestprice.gr/item/2157518952/samsung-pm9a3-ssd-1-92tb-u-2-nvme-pci-express-4-0.html"),
         ("skroutz", "Samsung PM9A3 1.9TB Blade MZQL21T9HCJR-00A07",
          "https://www.skroutz.gr/s/38456340/Samsung-PM9A3-SSD-1-9TB-typou-Blade-me-syndesi-PCI-Express-4-0-MZQL21T9HCJR-00A07-Bulk.html"),
         ("shopflix", "SSD Samsung PM9A3 1.9TB Blade NVMe PCI Express 4.0 Bulk",
          "https://shopflix.gr/p/SF-105312021/ssd-skliros-diskos-samsung-pm9a3-1-9tb-blade-nvme-pci-express-4-0"),
         ("shopflix", "Samsung PM9A3 SSD Σκληρός Δίσκος 1.9TB Blade NVMe PCI Express 4.0 Bulk",
          "https://shopflix.gr/p/SF-10836176/samsung-pm9a3-ssd-skleros-diskos-1-9tb-blade-nvme-pci-express-4-0-bulk"),
         ("skroutz", "Samsung PM9A3 1.9TB M.2 MZ1L21T9HCLS-00A07",
          "https://www.skroutz.gr/s/39326017/Samsung-PM9A3-SSD-1-9TB-typou-M-2-me-syndesi-PCI-Express-4-0-PS5-Compatible-MZ1L21T9HCLS-00A07-Bulk.html"),
         ("bestprice", "Samsung PM9A3 SSD 1.92TB M.2 NVMe PCI Express 4.0",
          "https://www.bestprice.gr/item/2157610191/samsung-pm9a3-ssd-1-92tb-m-2-nvme-pci-express-4-0.html")]
U2, M2 = "Samsung PM9A3 1.92TB U.2", "Samsung PM9A3 1.92TB"
expect("I6: PM9A3 1.92TB: MZQL21T9HCJR (-00A07 = -00W07) joins U.2; no-part Blades and M.2 stay",
       chips(settled(PM9A3)), [U2, U2, U2, M2, M2, M2, M2])
pmd = dicts_of(PM9A3)
if pmd:
    normalize_storage.settle(pmd)
    expect("I6: joined listing's form + tier", (pmd[2]["formFactor"], pmd[2]["tier"]), ("U.2", "Server"))
    again = copy.deepcopy(pmd)
    normalize_storage.settle(again)
    expect("I6: settle twice = once (U.2)", again, pmd)
    alone = [copy.deepcopy(pmd[2])]
    normalize_storage.settle(alone)
    expect("I6: reversal (U.2 listing gone)", (alone[0]["chip"], alone[0]["formFactor"]),
           (M2, make(*PM9A3[2]).formFactor))
# I3 / I5: the U.2 listing (BestPrice) carries no part number in its title, so nothing links the shops' "PCIe card"
# / "M.2" listings to it: they stay where their own titles put them (reported for the owner).
PM9D3A = [("bestprice", 'Samsung PM9D3a SSD 960GB 2.5" NVMe PCI Express 5.0',
           "https://www.bestprice.gr/item/2163515502/samsung-pm9d3a-ssd-960gb-2-5-nvme-pci-express-5-0.html"),
          ("skroutz", "Samsung PM9D3a 960GB PCle Card MZWL6960HFJA-00AW7",
           "https://www.skroutz.gr/s/65111414/samsung-pm9d3a-ssd-960gb-typou-pcle-card-me-syndesi-pci-express-5-0-mzwl6960hfja-00aw7-bulk.html"),
          ("shopflix", "Samsung PM9D3a SSD Σκληρός Δίσκος 960GB τύπου PCle Card MZWL6960HFJA-00AW7 Bulk",
           "https://shopflix.gr/p/SF-201688377/samsung-pm9d3a-ssd-skleros-diskos-960gb-tupou-pcle-card-mzwl6960hfja-00aw7-bulk")]
expect("I3: PM9D3a 960GB: no part number on the U.2 side, no join", chips(settled(PM9D3A)),
       ["Samsung PM9D3a 960GB U.2", "Samsung PM9D3a 960GB", "Samsung PM9D3a 960GB"])
CD8R = [("bestprice", 'Kioxia CD8-R SSD 7.68TB 2.5" NVMe PCI Express 4.0',
         "https://www.bestprice.gr/item/2159912995/kioxia-cd8-r-ssd-7-68tb-2-5-nvme-pci-express-4-0.html"),
        ("skroutz", "Kioxia CD8-R 7.7TB M.2 KCD8XRUG7T68",
         "https://www.skroutz.gr/s/50517238/Kioxia-CD8-R-SSD-7-7TB-typou-M-2-me-syndesi-PCI-Express-4-0-KCD8XRUG7T68.html"),
        ("shopflix", "SSD Kioxia CD8-R 7.7TB M.2 NVMe PCI Express 4.0",
         "https://shopflix.gr/p/SF-105971013/ssd-kioxia-cd8-r-7-7tb-m-2-nvme-pci-express-4-0")]
expect("I5: Kioxia CD8-R 7.68TB: no part number on the U.2 side, no join", chips(settled(CD8R)),
       ["Kioxia CD8-R 7.68TB U.2", "Kioxia CD8-R 7.68TB", "Kioxia CD8-R 7.68TB"])
# The same, with a U.2 listing that does carry the part number: the M.2-titled one joins it (the part number wins).
CD8R_P = [("skroutz", "Kioxia CD8-R 7.68TB 2.5'' KCD8XRUG7T68",
           "https://www.skroutz.gr/s/1/Kioxia-CD8-R-SSD-7-68TB-typou-2-5-me-syndesi-PCI-Express-4-0-KCD8XRUG7T68.html")] + CD8R[1:]
expect("I5: with the part number on a U.2 listing, the M.2-titled one joins", chips(settled(CD8R_P)),
       ["Kioxia CD8-R 7.68TB U.2", "Kioxia CD8-R 7.68TB U.2", "Kioxia CD8-R 7.68TB"])

# I7: a drive that is SAS only by its 10k / 15k rpm is a server drive, like one whose title says SAS.
hp = make("skroutz", 'HP 600GB 3.5" 10000rpm 846292-001',
          "https://www.skroutz.gr/s/69435304/hp-600gb-hdd-skliros-diskos-3-5-10000rpm-gia-846292-001.html")
expect("I7: HP 846292-001 SAS + Server", (get(hp, "chip"), get(hp, "iface"), get(hp, "tier")),
       ("HP 846292-001 600GB SAS", "SAS", "Server"))
hp2 = make("skroutz", 'HP 600GB 3.5" 15000rpm 870794-001B',
           "https://www.skroutz.gr/s/69435724/hp-600gb-hdd-skliros-diskos-3-5-15000rpm-gia-870794-001b.html")
expect("I7: HP 870794-001B Server", get(hp2, "tier"), "Server")
# A weak listing settled into SAS is a server drive too.
bcbc = dicts_of(FOURTEEN["Dell 161-BCBC 2TB"][0])
if bcbc:
    normalize_storage.settle(bcbc)
    expect("I7: settled SAS listing is Server", bcbc[1]["tier"], "Server")

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
