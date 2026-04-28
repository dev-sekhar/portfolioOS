import re
import time
import pandas as pd
import requests
from io import StringIO
from bs4 import BeautifulSoup

NSE_ARCHIVE_CSV = "https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from={from_date}&to={to_date}&csv=true"
BSE_PAGE = "https://www.bseindia.com/markets/equity/EQReports/bulk_deals.aspx"
BSE_BASE = "https://www.bseindia.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
    "Connection": "keep-alive",
}

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [re.sub(r"\s+", " ", str(c)).strip() for c in df.columns]
    rename_map = {
        "Buy/Sell": "Buy / Sell",
        "Buy Sell": "Buy / Sell",
        "Trade Price / Wght. Avg. Price": "Trade Price / Wght. Avg. Price",
        "Trade Price/Wght. Avg. Price": "Trade Price / Wght. Avg. Price",
        "Qty Traded": "Quantity Traded",
        "Quantity Traded": "Quantity Traded",
        "Security": "Security Name",
    }
    df = df.rename(columns=rename_map)
    return df

def fetch_nse(from_date: str, to_date: str) -> pd.DataFrame:
    session = requests.Session()
    session.headers.update(HEADERS)
    session.get("https://www.nseindia.com", timeout=30)
    time.sleep(1)
    url = NSE_ARCHIVE_CSV.format(from_date=from_date, to_date=to_date)
    r = session.get(url, timeout=60)
    r.raise_for_status()
    content_type = r.headers.get("content-type", "")
    text = r.text.strip()
    if "text/csv" in content_type or text.startswith("Date,") or text.startswith("Date|"):
        try:
            df = pd.read_csv(StringIO(text))
        except Exception:
            df = pd.read_csv(StringIO(text), sep="|")
    else:
        raise RuntimeError(f"Unexpected NSE response: {content_type} {text[:200]}")
    df = normalize_columns(df)
    df["source"] = "nse"
    return df

def extract_bse_download_link(html: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = a.get_text(" ", strip=True).lower()
        if "csv" in href.lower() or "csv" in text or "download" in text:
            if href.startswith("http"):
                return href
            return requests.compat.urljoin(BSE_BASE, href)
    return None

def fetch_bse(from_date: str, to_date: str) -> pd.DataFrame:
    raise RuntimeError("BSE data extraction is currently blocked by BSE's anti-bot protections (WAF) for automated requests. Please rely on NSE data or manually download from the BSE website.")

def extract_bulk_deals(from_date: str, to_date: str) -> pd.DataFrame:
    frames = []
    errors = []
    try:
        nse = fetch_nse(from_date, to_date)
        frames.append(nse)
    except Exception as e:
        errors.append(f"NSE failed: {e}")
    try:
        bse = fetch_bse(from_date, to_date)
        frames.append(bse)
    except Exception as e:
        errors.append(str(e))
    if not frames:
        raise RuntimeError("Both NSE and BSE extraction failed. " + " | ".join(errors))
    combined = pd.concat(frames, ignore_index=True, sort=False)
    return combined, errors
