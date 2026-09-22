from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DenseDataUiContractTests(unittest.TestCase):
    def test_matrix_uses_dynamic_columns_and_compact_limits(self):
        app = (ROOT / "app.js").read_text(encoding="utf-8")
        css = (ROOT / "app.css").read_text(encoding="utf-8")
        html = (ROOT / "index.html").read_text(encoding="utf-8")

        self.assertIn("allProjects.slice(0,6)", app)
        self.assertIn("allModels.slice(0,5)", app)
        self.assertIn("state.matrixExpanded", app)
        self.assertIn("repeat(var(--matrix-cols", css)
        self.assertNotIn("grid-template-columns:130px repeat(4", css)
        self.assertIn('id="matrix-compact"', html)
        self.assertIn('id="matrix-all"', html)

    def test_project_distribution_hides_zero_usage_rows(self):
        app = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn(".filter(item=>item.total>0)", app)
        self.assertIn("formatProjectShare", app)
        self.assertIn("'<0.1%'", app)
        self.assertNotIn(".filter(v=>v.total>0||state.project==='all')", app)

    def test_dense_views_have_long_label_safety(self):
        app = (ROOT / "app.js").read_text(encoding="utf-8")
        css = (ROOT / "app.css").read_text(encoding="utf-8")
        self.assertIn("truncateMiddle", app)
        self.assertIn("text-overflow:ellipsis", css)
        self.assertIn("pageSize=8", app)

    def test_quota_cards_make_used_semantics_and_stale_state_explicit(self):
        app = (ROOT / "app.js").read_text(encoding="utf-8")
        html = (ROOT / "index.html").read_text(encoding="utf-8")

        self.assertIn('id="five-used-label">% used</small>', html)
        self.assertIn('id="week-used-label">% used</small>', html)
        self.assertIn("Account-wide · Observed window", html)
        self.assertIn("Window snapshot", html)
        self.assertIn("function expireQuotaSnapshotsNow", app)
        self.assertIn("old percentage hidden", app)
        self.assertIn("cannot force an account sync", app)
        self.assertIn("IS_LIVE_REPORT?sidecarQuota", app)

    def test_session_intelligence_contract(self):
        app = (ROOT / "app.js").read_text(encoding="utf-8")
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        css = (ROOT / "app.css").read_text(encoding="utf-8")

        self.assertIn("function aggregateTaskTurns", app)
        self.assertIn("contextGrowth", app)
        self.assertIn("firstAvgInput", app)
        self.assertIn("lastAvgInput", app)
        self.assertIn("peakTurn", app)
        self.assertIn("function classifySession", app)
        self.assertIn("function renderSessionHealth", app)
        self.assertIn("function contextGrowthChart", app)
        self.assertIn('id="tokens-turn"', html)
        self.assertIn('id="session-health-summary"', html)
        self.assertIn('id="context-watch-list"', html)
        self.assertIn(".context-chart", css)
        self.assertIn(".health-chip", css)


if __name__ == "__main__":
    unittest.main()