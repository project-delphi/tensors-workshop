"""Exercise checks accept independent answers and diagnose common mistakes."""

import io
import json
import unittest
from contextlib import redirect_stdout
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def checker(number):
    path = next((ROOT / "notebooks").glob(f"{number}-*.ipynb"))
    nb = json.loads(path.read_text())
    source = next(c["source"] for c in nb["cells"] if c["id"] == f"p{number}-feedback")
    namespace = {"np": np}
    exec("".join(source), namespace)
    return namespace["check_core_answer"]


class MatrixFeedback(unittest.TestCase):
    def setUp(self):
        self.check = checker("09")
        self.X = np.array([[1.0, 0.0], [1.0, 1.0], [1.0, 2.0], [1.0, 3.0]])
        self.y = np.array([1.0, 2.0, 2.0, 4.0])
        self.normal = np.linalg.solve(self.X.T @ self.X, self.X.T @ self.y)
        Q, R = np.linalg.qr(self.X)
        self.qr = np.linalg.solve(R, Q.T @ self.y)
        ref = np.linalg.lstsq(self.X, self.y, rcond=None)[0]
        self.residuals = [
            np.linalg.norm(self.X @ b - self.y) for b in (self.normal, self.qr, ref)
        ]
        self.errors = [
            np.linalg.norm(b - ref) / np.linalg.norm(ref)
            for b in (self.normal, self.qr)
        ]

    def run_check(self, **changes):
        arguments = dict(
            X=self.X,
            y=self.y,
            beta_normal=self.normal,
            beta_qr=self.qr,
            residuals=self.residuals,
            coefficient_errors=self.errors,
        )
        arguments.update(changes)
        with redirect_stdout(io.StringIO()):
            return self.check(**arguments)

    def test_accepts_independent_correct_metrics(self):
        self.assertTrue(self.run_check())

    def test_rejects_residuals_used_as_coefficient_errors(self):
        with self.assertRaisesRegex(AssertionError, "coefficient difference"):
            self.run_check(coefficient_errors=self.residuals[:2])

    def test_rejects_unfitted_coefficients(self):
        with self.assertRaisesRegex(AssertionError, "Q.T"):
            self.run_check(beta_qr=np.zeros(2))
        self.assertTrue(self.run_check())

    def test_rejects_broadcastable_coefficient_column(self):
        with self.assertRaisesRegex(AssertionError, "per column"):
            self.run_check(beta_normal=self.normal[:, None])

    def test_explains_undefined_relative_error_for_zero_reference(self):
        with self.assertRaisesRegex(AssertionError, "nonzero reference"):
            self.run_check(y=np.zeros(4), beta_normal=np.zeros(2), beta_qr=np.zeros(2))


class TensorFeedback(unittest.TestCase):
    def setUp(self):
        self.check = checker("11")
        # Deliberately unlike taxi data: verifies the checker uses its arguments.
        self.tensor = np.arange(1.0, 25.0).reshape(2, 3, 4)
        self.cp_hat = self.tensor * 0.8
        self.tu_hat = self.tensor * 0.9
        self.counts = [2 * (2 + 3 + 4), 1 * 2 * 2 + 2 * 1 + 3 * 2 + 4 * 2]

    def run_check(self, **changes):
        arguments = dict(
            tensor=self.tensor,
            cp_rank=2,
            tucker_ranks=(1, 2, 2),
            cp_hat=self.cp_hat,
            tu_hat=self.tu_hat,
            parameter_counts=self.counts,
            relative_errors=[0.2, 0.1],
        )
        arguments.update(changes)
        with redirect_stdout(io.StringIO()):
            return self.check(**arguments)

    def test_accepts_independent_counts_and_errors(self):
        self.assertTrue(self.run_check())

    def test_rejects_tucker_budget_that_omits_core(self):
        with self.assertRaisesRegex(AssertionError, "core"):
            self.run_check(parameter_counts=[self.counts[0], self.counts[1] - 4])
        self.assertTrue(self.run_check())

    def test_rejects_broadcastable_reconstruction(self):
        with self.assertRaisesRegex(AssertionError, "original axes"):
            self.run_check(cp_hat=self.cp_hat[:1])

    def test_rejects_absolute_error_reported_as_relative(self):
        absolute = [np.linalg.norm(self.tensor - a) for a in (self.cp_hat, self.tu_hat)]
        with self.assertRaisesRegex(AssertionError, "Relative error"):
            self.run_check(relative_errors=absolute)

    def test_rejects_swapped_errors_and_invalid_ranks(self):
        with self.assertRaisesRegex(AssertionError, "Relative error"):
            self.run_check(relative_errors=[0.1, 0.2])
        with self.assertRaisesRegex(AssertionError, "axis sizes"):
            self.run_check(tucker_ranks=(3, 2, 2))


if __name__ == "__main__":
    unittest.main()
