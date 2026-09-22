#!/usr/bin/env python3
"""Generate a local Ledger dashboard from Codex session JSONL files.

The parser is deliberately local-only and dependency-free. It reads metadata and token
usage from Codex's persisted session files, discards prompt/tool contents, normalizes
records, and writes a local dashboard that can be opened in any browser.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_FILES = ("index.html", "app.css", "app.js")
DEFAULT_DAYS = 90


def iso_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        try:
            seconds = float(value)
            if seconds > 1e12:
                seconds /= 1000
            return datetime.fromtimestamp(seconds, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None
    text = str(value).strip()
    if not text:
        return None
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        parsed = datetime.fromisoformat(text)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return None


def safe_int(value: Any) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def project_name(cwd: Any) -> str:
    if not cwd:
        return "Unattributed"
    text = str(cwd).rstrip("/\\")
    if not text:
        return "Unattributed"
    name = Path(text).name
    if name in {"", ".", "/"}:
        return "Unattributed"
    # Only the basename is retained. Full local paths never enter the report payload.
    return name[:120]


def short_session_name(session_id: str) -> str:
    return f"Session {session_id[:8]}" if session_id else "Untitled session"


def load_thread_names(codex_home: Path) -> dict[str, str]:
    path = codex_home / "session_index.jsonl"
    names: dict[str, str] = {}
    if not path.is_file():
        return names
    try:
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            for raw in handle:
                try:
                    row = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                sid = str(row.get("id") or "")
                title = row.get("thread_name")
                if sid and isinstance(title, str) and title.strip():
                    # Later rows are newer for the same thread.
                    names[sid] = " ".join(title.split())[:180]
    except OSError:
        pass
    return names


def session_file_date(path: Path) -> datetime | None:
    # Codex currently stores rollouts in sessions/YYYY/MM/DD/... .
    parts = path.parts
    for index, part in enumerate(parts):
        if part not in {"sessions", "archived_sessions"}:
            continue
        try:
            y, m, d = map(int, parts[index + 1 : index + 4])
            return datetime(y, m, d, tzinfo=timezone.utc)
        except (ValueError, IndexError):
            return None
    return None


def iter_session_files(codex_home: Path, cutoff: datetime | None) -> Iterable[Path]:
    for dirname in ("sessions", "archived_sessions"):
        base = codex_home / dirname
        if not base.is_dir():
            continue
        for path in base.rglob("rollout-*.jsonl"):
            if cutoff:
                dated = session_file_date(path)
                if dated and dated.date() < cutoff.date():
                    continue
            yield path


@dataclass
class ParseStats:
    files_seen: int = 0
    files_parsed: int = 0
    malformed_lines: int = 0
    token_events: int = 0
    sessions_with_tokens: int = 0
    earliest: datetime | None = None
    latest: datetime | None = None
    warnings: list[str] = field(default_factory=list)

    def touch(self, dt: datetime | None) -> None:
        if not dt:
            return
        if self.earliest is None or dt < self.earliest:
            self.earliest = dt
        if self.latest is None or dt > self.latest:
            self.latest = dt


@dataclass
class QuotaObservation:
    observed_at: datetime
    rate_limits: dict[str, Any]


def parse_rate_window(value: Any, observed_at: datetime) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    used = value.get("used_percent")
    try:
        used_f = float(used)
    except (TypeError, ValueError):
        return None
    window_minutes = value.get("window_minutes")
    try:
        window_seconds = max(0, int(float(window_minutes) * 60)) if window_minutes is not None else 0
    except (TypeError, ValueError):
        window_seconds = 0

    reset_dt = iso_dt(value.get("resets_at"))
    if reset_dt:
        seconds = max(0, int((reset_dt - observed_at).total_seconds()))
    else:
        seconds = safe_int(value.get("resets_in_seconds"))
        reset_dt = observed_at + timedelta(seconds=seconds) if seconds else None

    elapsed = None
    if window_seconds and seconds <= window_seconds:
        elapsed = max(0.0, min(100.0, (window_seconds - seconds) / window_seconds * 100))

    result: dict[str, Any] = {
        "used": max(0.0, min(100.0, used_f)),
        "seconds": seconds,
        "source": "live",
    }
    if elapsed is not None:
        result["elapsed"] = round(elapsed, 2)
    if reset_dt:
        result["resetsAt"] = reset_dt.isoformat().replace("+00:00", "Z")
    if window_minutes is not None:
        result["windowMinutes"] = window_minutes
    return result


def expire_rate_window(window: dict[str, Any] | None, now: datetime) -> dict[str, Any] | None:
    """Hide a percentage once its observed reset boundary has passed.

    Ledger cannot force Codex to query the account quota service. Keeping the old
    percentage after the reset would be more misleading than marking it stale.
    """
    if not window:
        return None
    reset_dt = iso_dt(window.get("resetsAt"))
    if not reset_dt or reset_dt > now:
        return window
    stale = dict(window)
    stale.update({"used": None, "seconds": 0, "source": "stale", "stale": True})
    return stale


def quota_payload(observation: QuotaObservation | None, now: datetime | None = None) -> dict[str, Any] | None:
    if not observation:
        return None
    current = now or datetime.now(timezone.utc)
    rate_limits = observation.rate_limits
    primary = expire_rate_window(parse_rate_window(rate_limits.get("primary"), observation.observed_at), current)
    secondary = expire_rate_window(parse_rate_window(rate_limits.get("secondary"), observation.observed_at), current)
    if not primary and not secondary:
        return None
    return {
        "observedAt": observation.observed_at.isoformat().replace("+00:00", "Z"),
        "five": primary or {"used": None, "seconds": 0, "source": "unavailable"},
        "week": secondary or {"used": None, "seconds": 0, "source": "unavailable"},
    }


def extract_usage(info: Any) -> dict[str, int] | None:
    if not isinstance(info, dict):
        return None
    # last_token_usage is the per-request delta. Summing total_token_usage would
    # repeatedly add cumulative session totals and dramatically overcount usage.
    usage = info.get("last_token_usage")
    if not isinstance(usage, dict):
        return None
    total = safe_int(usage.get("total_tokens"))
    input_tokens = safe_int(usage.get("input_tokens"))
    output_tokens = safe_int(usage.get("output_tokens"))
    if total <= 0 and input_tokens <= 0 and output_tokens <= 0:
        return None
    return {
        "input": input_tokens,
        "cached": min(input_tokens, safe_int(usage.get("cached_input_tokens"))),
        "output": output_tokens,
        "reasoning": safe_int(usage.get("reasoning_output_tokens")),
        "total": total or input_tokens + output_tokens,
    }


def parse_session(path: Path, thread_names: dict[str, str], stats: ParseStats) -> tuple[list[dict[str, Any]], QuotaObservation | None]:
    stats.files_seen += 1
    session_id = ""
    session_cwd: str | None = None
    session_model = "unknown"
    current_turn_id = ""
    current_model = "unknown"
    records: list[dict[str, Any]] = []
    records_by_turn: dict[str, list[int]] = {}
    latest_quota: QuotaObservation | None = None

    try:
        handle = path.open("r", encoding="utf-8", errors="replace")
    except OSError as exc:
        stats.warnings.append(f"Could not read one rollout: {exc.__class__.__name__}")
        return records, latest_quota

    with handle:
        for raw in handle:
            raw = raw.strip()
            if not raw:
                continue
            try:
                row = json.loads(raw)
            except json.JSONDecodeError:
                stats.malformed_lines += 1
                continue
            timestamp = iso_dt(row.get("timestamp"))
            event_type = row.get("type")
            payload = row.get("payload") if isinstance(row.get("payload"), dict) else {}

            if event_type == "session_meta":
                session_id = str(payload.get("id") or payload.get("session_id") or session_id)
                session_cwd = str(payload.get("cwd") or session_cwd or "") or None
                provider = payload.get("model") or payload.get("model_name")
                if isinstance(provider, str) and provider:
                    session_model = provider
                    current_model = provider
                continue

            if event_type == "turn_context":
                current_turn_id = str(payload.get("turn_id") or current_turn_id)
                if payload.get("cwd"):
                    session_cwd = str(payload.get("cwd"))
                model = payload.get("model")
                if isinstance(model, str) and model:
                    current_model = model
                continue

            if event_type != "event_msg":
                continue

            ptype = payload.get("type")
            if ptype == "task_started":
                current_turn_id = str(payload.get("turn_id") or current_turn_id)
                continue

            if ptype == "token_count":
                info = payload.get("info")
                usage = extract_usage(info)
                if isinstance(payload.get("rate_limits"), dict) and timestamp:
                    latest_quota = QuotaObservation(timestamp, payload["rate_limits"])
                if not usage or not timestamp:
                    continue
                turn_id = current_turn_id or f"turn-{len(records) + 1}"
                sid = session_id or path.stem.rsplit("-", 1)[-1]
                record_index = len(records)
                records.append({
                    "id": f"{sid}-{record_index + 1}",
                    "timestamp": timestamp.isoformat().replace("+00:00", "Z"),
                    "date": timestamp.astimezone().date().isoformat(),
                    "time": timestamp.astimezone().strftime("%H:%M"),
                    "taskId": sid,
                    "turnId": turn_id,
                    "task": thread_names.get(sid, short_session_name(sid)),
                    "project": project_name(session_cwd),
                    "model": current_model if current_model != "unknown" else session_model,
                    **usage,
                    "durationSeconds": 0,
                    "speedOutput": 0,
                    "_turnId": turn_id,
                })
                records_by_turn.setdefault(turn_id, []).append(record_index)
                stats.token_events += 1
                stats.touch(timestamp)
                continue

            if ptype == "task_complete":
                turn_id = str(payload.get("turn_id") or current_turn_id)
                duration_ms = payload.get("duration_ms")
                try:
                    duration_seconds = max(0.0, float(duration_ms) / 1000) if duration_ms is not None else 0
                except (TypeError, ValueError):
                    duration_seconds = 0
                indexes = records_by_turn.get(turn_id, [])
                if duration_seconds > 0 and indexes:
                    # Attach the turn duration once, on the final token event, and use
                    # all turn output as the numerator for model generation speed.
                    speed_output = sum(safe_int(records[i].get("output")) for i in indexes)
                    records[indexes[-1]]["durationSeconds"] = round(duration_seconds, 6)
                    records[indexes[-1]]["speedOutput"] = speed_output
                continue

    if records:
        stats.files_parsed += 1
        stats.sessions_with_tokens += 1
    for record in records:
        record.pop("_turnId", None)
    return records, latest_quota


def collect(codex_home: Path, days: int | None) -> tuple[list[dict[str, Any]], dict[str, Any] | None, ParseStats]:
    thread_names = load_thread_names(codex_home)
    cutoff = None
    if days and days > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    stats = ParseStats()
    all_records: list[dict[str, Any]] = []
    newest_quota: QuotaObservation | None = None
    for path in sorted(iter_session_files(codex_home, cutoff)):
        records, observation = parse_session(path, thread_names, stats)
        all_records.extend(records)
        if observation and (newest_quota is None or observation.observed_at > newest_quota.observed_at):
            newest_quota = observation
    all_records.sort(key=lambda row: (row["date"], row["time"], row["id"]))
    return all_records, quota_payload(newest_quota), stats


def payload_for(records: list[dict[str, Any]], quota: dict[str, Any] | None, stats: ParseStats, codex_home: Path) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    projects = len({r["project"] for r in records})
    tasks = len({r["taskId"] for r in records})
    models = len({r["model"] for r in records})
    return {
        "meta": {
            "generatedAt": now.isoformat().replace("+00:00", "Z"),
            "observedAt": (stats.latest or now).isoformat().replace("+00:00", "Z"),
            "source": "codex-local-session-jsonl",
            "mode": "local",
            "coverage": {
                "filesSeen": stats.files_seen,
                "filesParsed": stats.files_parsed,
                "sessionsWithTokens": stats.sessions_with_tokens,
                "tokenEvents": stats.token_events,
                "malformedLines": stats.malformed_lines,
                "earliest": stats.earliest.isoformat().replace("+00:00", "Z") if stats.earliest else None,
                "latest": stats.latest.isoformat().replace("+00:00", "Z") if stats.latest else None,
            },
            "counts": {"projects": projects, "tasks": tasks, "models": models, "records": len(records)},
            "privacy": "Prompt bodies, assistant/tool output, raw logs, secrets, and full local paths are not copied. The local report may include session titles and project-folder basenames for attribution.",
            "codexHomeDetected": codex_home.exists(),
        },
        "quota": quota,
        "records": records,
    }


def write_js(path: Path, payload: dict[str, Any]) -> None:
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    path.write_text(f"window.__LEDGER_DATA__ = {data};\n", encoding="utf-8")


def write_quota_js(path: Path, quota: dict[str, Any] | None) -> None:
    # Always emit the sidecar because generated index.html references it. A null
    # value makes "quota unavailable" explicit without producing a browser 404.
    data = json.dumps(quota, ensure_ascii=False, separators=(",", ":")) if quota else "null"
    path.write_text(f"window.__CODEX_QUOTA_SNAPSHOT__ = {data};\n", encoding="utf-8")


def write_refresh_bridge(path: Path) -> None:
    path.write_text(
        """(function () {
  if (!/^https?:$/.test(window.location.protocol)) return;
  window.__LEDGER_LIVE_SERVER__ = true;
  window.ledgerRefreshAdapter = async function () {
    const response = await fetch(`/api/refresh?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Ledger refresh failed (${response.status})`);
    const payload = await response.json();
    const windows=[payload?.quota?.five,payload?.quota?.week].filter(Boolean);
    const quotaState=windows.some(item=>item?.source==='stale')?'stale':(windows.some(item=>item?.used!==null&&item?.used!==undefined)?'observed':'unavailable');
    return { reload: true, records: payload?.meta?.counts?.records ?? 0, generatedAt: payload?.meta?.generatedAt ?? null, quotaState };
  };
})();
""",
        encoding="utf-8",
    )


def refresh_report_data(output: Path, codex_home: Path, days: int | None) -> dict[str, Any]:
    records, quota, stats = collect(codex_home, days)
    payload = payload_for(records, quota, stats, codex_home)
    write_js(output / "ledger-data.local.js", payload)
    write_quota_js(output / "quota-snapshot.local.js", quota)
    return payload


class LedgerRequestHandler(SimpleHTTPRequestHandler):
    """Serve the generated report and expose a local-only refresh endpoint."""

    refresh_callback = None

    def end_headers(self) -> None:
        # Live Ledger data should never be stuck behind the browser cache.
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, format: str, *args: Any) -> None:
        # Keep CLI output focused on Ledger status rather than every asset request.
        return

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/refresh":
            callback = type(self).refresh_callback
            if callback is None:
                self.send_error(503, "Refresh unavailable")
                return
            try:
                payload = callback()
                body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as exc:  # pragma: no cover - defensive server boundary
                body = json.dumps({"error": exc.__class__.__name__}).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            return
        super().do_GET()


def serve_report(output: Path, codex_home: Path, days: int | None, host: str, port: int, open_browser: bool) -> None:
    handler = partial(LedgerRequestHandler, directory=str(output))
    # SimpleHTTPRequestHandler's partial keeps the subclass type, so attach the
    # callback to the class rather than the partial object.
    LedgerRequestHandler.refresh_callback = lambda: refresh_report_data(output, codex_home, days)
    server = ThreadingHTTPServer((host, port), handler)
    actual_port = server.server_address[1]
    url = f"http://{host}:{actual_port}/"
    print(f"  live:     {url}")
    print("  refresh:  enabled · rescans local Codex telemetry without calling a model")
    print("  stop:     Ctrl+C")
    if open_browser:
        threading.Timer(0.15, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nLedger live server stopped.")
    finally:
        server.server_close()


def build_report(output: Path, payload: dict[str, Any]) -> Path:
    output.mkdir(parents=True, exist_ok=True)
    for filename in DASHBOARD_FILES:
        source = ROOT / filename
        if not source.is_file():
            raise FileNotFoundError(f"Missing dashboard asset: {source}")
        shutil.copy2(source, output / filename)

    index_path = output / "index.html"
    index = index_path.read_text(encoding="utf-8")
    marker = '<script src="quota-snapshot.example.js?v=demo-1"></script>'
    injection = '<script src="ledger-data.local.js"></script>\n  <script src="quota-snapshot.local.js"></script>\n  <script src="ledger-refresh.local.js"></script>'
    if marker in index:
        index = index.replace(marker, injection)
    else:
        index = index.replace('<script src="app.js', injection + '\n  <script src="app.js', 1)
    index_path.write_text(index, encoding="utf-8")

    write_js(output / "ledger-data.local.js", payload)
    write_quota_js(output / "quota-snapshot.local.js", payload.get("quota"))
    write_refresh_bridge(output / "ledger-refresh.local.js")
    return index_path


def print_summary(payload: dict[str, Any], report: Path | None) -> None:
    meta = payload["meta"]
    counts = meta["counts"]
    coverage = meta["coverage"]
    print("Ledger local report")
    print(f"  records:  {counts['records']}")
    print(f"  tasks:    {counts['tasks']}")
    print(f"  projects: {counts['projects']}")
    print(f"  models:   {counts['models']}")
    print(f"  rollouts: {coverage['filesParsed']} parsed / {coverage['filesSeen']} seen")
    if coverage["malformedLines"]:
        print(f"  warning:  {coverage['malformedLines']} malformed JSONL lines skipped")
    if payload.get("quota"):
        print("  quota:    observed rate-limit snapshot found")
    else:
        print("  quota:    unavailable in parsed events")
    if report:
        print(f"  report:   {report}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a local Codex usage dashboard.")
    parser.add_argument("--codex-home", type=Path, default=Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")), help="Codex home directory (default: $CODEX_HOME or ~/.codex)")
    parser.add_argument("--output", type=Path, default=Path.home() / ".codex" / "ledger" / "latest", help="Report output directory")
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS, help=f"Parse the most recent N days (default: {DEFAULT_DAYS}; 0 = all)")
    parser.add_argument("--open", action="store_true", help="Open the dashboard and keep a local live-refresh server running")
    parser.add_argument("--serve", action="store_true", help="Serve the dashboard on localhost with live refresh (without opening a browser)")
    parser.add_argument("--host", default="127.0.0.1", help="Live server bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=0, help="Live server port (default: choose an available local port)")
    parser.add_argument("--json", action="store_true", help="Print the sanitized normalized payload to stdout instead of writing a report")
    args = parser.parse_args()

    codex_home = args.codex_home.expanduser().resolve()
    records, quota, stats = collect(codex_home, args.days or None)
    payload = payload_for(records, quota, stats, codex_home)

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    report = build_report(args.output.expanduser().resolve(), payload)
    print_summary(payload, report)
    if not records:
        print("\nNo token_count events were found. Ledger will still open, but the report contains no live usage records.", file=sys.stderr)
    if args.open or args.serve:
        serve_report(
            args.output.expanduser().resolve(),
            codex_home,
            args.days or None,
            args.host,
            args.port,
            args.open,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())