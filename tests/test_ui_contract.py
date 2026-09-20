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

    def test_dense_views_have_long_label_safety(self):
        app = (ROOT / "app.js").read_text(encoding="utf-8")
        css = (ROOT / "app.css").read_text(encoding="utf-8")
        self.assertIn("truncateMiddle", app)
        self.assertIn("text-overflow:ellipsis", css)
        self.assertIn("pageSize=8", app)


if __name__ == "__main__":
    unittest.main()