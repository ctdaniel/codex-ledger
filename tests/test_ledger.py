import json
import tempfile
import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import ledger


class LedgerParserTests(unittest.TestCase):
    def make_home(self, root: Path):
        home = root / ".codex"
        session_dir = home / "sessions" / "2026" / "09" / "19"
        session_dir.mkdir(parents=True)
        (home / "session_index.jsonl").write_text(
            json.dumps({"id": "session-abc", "thread_name": "Refactor dashboard"}) + "\n",
            encoding="utf-8",
        )
        lines = [
            {
                "timestamp": "2026-09-19T01:00:00Z",
                "type": "session_meta",
                "payload": {"id": "session-abc", "cwd": "/synthetic/user/projects/codex-ledger"},
            },
            {
                "timestamp": "2026-09-19T01:00:01Z",
                "type": "turn_context",
                "payload": {"turn_id": "turn-1", "cwd": "/synthetic/user/projects/codex-ledger", "model": "gpt-5.6-sol"},
            },
            {
                "timestamp": "2026-09-19T01:00:02Z",
                "type": "event_msg",
                "payload": {
                    "type": "token_count",
                    "info": {
                        "total_token_usage": {"input_tokens": 999999, "cached_input_tokens": 999000, "output_tokens": 9999, "total_tokens": 1009998},
                        "last_token_usage": {"input_tokens": 1000, "cached_input_tokens": 800, "output_tokens": 100, "reasoning_output_tokens": 25, "total_tokens": 1100},
                    },
                    "rate_limits": {
                        "primary": {"used_percent": 31, "window_minutes": 300, "resets_at": 1789786800},
                        "secondary": {"used_percent": 18, "window_minutes": 10080, "resets_at": 1790388000},
                    },
                },
            },
            {
                "timestamp": "2026-09-19T01:00:04Z",
                "type": "event_msg",
                "payload": {
                    "type": "token_count",
                    "info": {
                        "last_token_usage": {"input_tokens": 2000, "cached_input_tokens": 1500, "output_tokens": 200, "reasoning_output_tokens": 50, "total_tokens": 2200}
                    },
                },
            },
            {
                "timestamp": "2026-09-19T01:00:05Z",
                "type": "event_msg",
                "payload": {"type": "task_complete", "turn_id": "turn-1", "duration_ms": 3000},
            },
        ]
        (session_dir / "rollout-2026-09-19T01-00-00-session-abc.jsonl").write_text(
            "\n".join(json.dumps(row) for row in lines) + "\n",
            encoding="utf-8",
        )
        return home

    def test_collect_uses_last_token_usage_and_strips_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = self.make_home(Path(tmp))
            records, quota, stats = ledger.collect(home, None)
            self.assertEqual(len(records), 2)
            self.assertEqual(sum(r["total"] for r in records), 3300)
            self.assertEqual(records[0]["project"], "codex-ledger")
            self.assertEqual(records[0]["task"], "Refactor dashboard")
            self.assertNotIn("/synthetic/user", json.dumps(records))
            self.assertEqual(records[-1]["durationSeconds"], 3)
            self.assertEqual(records[-1]["speedOutput"], 300)
            self.assertEqual(quota["five"]["used"], 31)
            self.assertEqual(quota["week"]["used"], 18)
            self.assertEqual(stats.token_events, 2)

    def test_report_payload_does_not_contain_prompt_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = self.make_home(Path(tmp))
            records, quota, stats = ledger.collect(home, None)
            payload = ledger.payload_for(records, quota, stats, home)
            serialized = json.dumps(payload)
            self.assertNotIn("/synthetic/user/projects", serialized)
            self.assertNotIn("total_token_usage", serialized)

    def test_build_report_writes_explicit_null_quota_sidecar(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "report"
            payload = {
                "meta": {"counts": {"records": 0, "tasks": 0, "projects": 0, "models": 0}, "coverage": {}},
                "quota": None,
                "records": [],
            }
            report = ledger.build_report(output, payload)
            self.assertTrue(report.is_file())
            quota_js = (output / "quota-snapshot.local.js").read_text(encoding="utf-8")
            self.assertIn("window.__CODEX_QUOTA_SNAPSHOT__ = null", quota_js)
            index = report.read_text(encoding="utf-8")
            self.assertIn("ledger-data.local.js", index)
            self.assertIn("quota-snapshot.local.js", index)



if __name__ == "__main__":
    unittest.main()
