"""Learner-facing scope, runnable identifiability feedback, and unlisted diagnostic."""

import contextlib
import io
import json
import re
import unittest
from pathlib import Path

import numpy as np
import yaml

ROOT = Path(__file__).resolve().parents[1]


class Identifiability(unittest.TestCase):
    def setUp(self):
        nb = json.loads(next((ROOT / "notebooks").glob("07-*.ipynb")).read_text())
        cells = {c["id"]: c for c in nb["cells"]}
        self.ns = {}
        with contextlib.redirect_stdout(io.StringIO()):
            for cid in ("p07-duplicate-prep", "p07-feedback"):
                exec("".join(cells[cid]["source"]), self.ns)
        self.check = self.ns["check_identifiability"]
        self.A, self.y = self.ns["A"], self.ns["target"]

    def test_equal_predictions_do_not_identify_coefficients(self):
        minimum = np.linalg.pinv(self.A) @ self.y
        np.testing.assert_allclose(minimum, [1, 1])
        for shift in (-3.0, 0.5, 4.0):
            other = minimum + [shift, -shift]
            with contextlib.redirect_stdout(io.StringIO()):
                self.check(self.A, self.y, self.y, self.y, minimum, other)
            np.testing.assert_allclose(self.A @ other, self.y)

    def test_rejects_exact_fit_that_is_not_minimum_norm(self):
        for minimum, other in (
            ([2.0, 0.0], [3.0, -1.0]),
            ([1.0, 1.0], [2.0, 2.0]),
            ([1.0, 1.0], [1.0, 1.0]),
            ([np.nan, 1.0], [3.0, -1.0]),
        ):
            with (
                self.subTest(minimum=minimum, other=other),
                self.assertRaises(AssertionError),
            ):
                self.check(self.A, self.y, self.y, self.y, minimum, other)

    def test_rejects_wrong_prediction_values_and_shapes(self):
        for pred in (self.y + 1, self.y[:, None], np.full(3, np.nan)):
            with self.subTest(pred=pred), self.assertRaises(AssertionError):
                self.check(self.A, self.y, pred, self.y, [1.0, 1.0], [3.0, -1.0])


class SharedOutcomes(unittest.TestCase):
    def test_live_headers_and_pages_use_shared_outcomes(self):
        variables = yaml.safe_load((ROOT / "_variables.yml").read_text())
        for key, section in variables["sections"].items():
            path = next((ROOT / "notebooks").glob(section["n"] + "-*.ipynb"))
            header = "".join(json.loads(path.read_text())["cells"][0]["source"])
            self.assertIn("Practise today / Practica hoy", header)
            self.assertIn("Explore later / Explora después", header)
            for lang in ("en", "es"):
                handbook = (
                    ROOT
                    / ("es" if lang == "es" else "")
                    / "tensors_workshop_plan_with_quizzes.md"
                )
                slides = ROOT / "slides" / lang / "index.qmd"
                for phase in ("practice", "explore"):
                    field = f"{phase}_{lang}"
                    self.assertTrue(section[field])
                    token = "{{< var sections." + key + "." + field + " >}}"
                    self.assertIn(token, handbook.read_text())
                    self.assertIn(token, slides.read_text())


class Readiness(unittest.TestCase):
    def test_diagnostic_is_unlisted_and_has_no_learner_answer_key(self):
        config = yaml.safe_load((ROOT / "_quarto.yml").read_text())
        navbar = str(config["website"]["navbar"])
        for prefix in ("", "es/"):
            for stem in (
                "readiness-check",
                "readiness-instructor",
                "readiness-refresher",
            ):
                name = prefix + stem + ".qmd"
                source = (ROOT / name).read_text()
                metadata = yaml.safe_load(source.split("---", 2)[1])
                self.assertIn(name, config["project"]["render"])
                self.assertNotIn(stem, navbar)
                self.assertFalse(metadata["search"])
                self.assertTrue(metadata["draft"])
                self.assertFalse(metadata["navbar"])
                self.assertIn("noindex, nofollow", source)
            learner = (ROOT / prefix / "readiness-check.qmd").read_text()
            self.assertEqual(len(re.findall(r"^## [1-4] ·", learner, re.M)), 4)
            self.assertNotIn("<details>", learner)
            self.assertNotIn("readiness-instructor", learner)
            self.assertNotIn("readiness-refresher", learner)
            self.assertIn("10 min", learner)

    def test_answer_key_math_and_refresher_retries(self):
        X = np.array([[10, 11, 12], [20, 21, 22]])
        np.testing.assert_array_equal(X[:, 1], [11, 21])
        self.assertEqual(X[:, 1].shape, (2,))
        np.testing.assert_array_equal(X + [1, 2, 3], [[11, 13, 15], [21, 23, 25]])
        A, w = np.array([[1, 2, 0], [0, 1, 1]]), np.array([2, 3, 4])
        np.testing.assert_array_equal(A @ w, [8, 7])
        self.assertEqual((A * w).shape, (2, 3))
        self.assertEqual(np.linalg.matrix_rank([[1, 2], [2, 4]]), 1)
        Q = np.array([[2, 4], [6, 8], [10, 12]])
        np.testing.assert_array_equal(Q[:, 1:2], [[4], [8], [12]])
        with self.assertRaises(ValueError):
            Q + np.array([10, 20, 30])
        self.assertEqual((Q + np.array([10, 20, 30])[:, None]).shape, (3, 2))
        np.testing.assert_array_equal(
            np.array([[2, 1], [1, 0], [0, 3]]) @ [4, 2], [10, 4, 6]
        )
        self.assertEqual(np.linalg.matrix_rank([[1, 0], [0, 2]]), 2)
        self.assertEqual(np.linalg.matrix_rank([[1, 3], [2, 6]]), 1)


if __name__ == "__main__":
    unittest.main()
