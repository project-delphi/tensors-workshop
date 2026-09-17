"""Student feedback rejects plausible axis mistakes without executing solutions."""

import json
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def load_feedback(number):
    path = next((ROOT / "notebooks").glob(f"{number}-*.ipynb"))
    notebook = json.loads(path.read_text())
    helper = next(c for c in notebook["cells"] if c["id"] == f"p{number}-core-feedback")
    namespace = {}
    # A fresh namespace deliberately has no setup or folded-solution variables.
    exec("".join(helper["source"]), namespace)
    return namespace["check_core_answer"]


class FoundationFeedback(unittest.TestCase):
    def test_standardization_accepts_constants_and_negative_values(self):
        check = load_feedback("03")
        data = np.array(
            [[0.0, -4.0, 7.0], [2.0, 0.0, 7.0], [10.0, 10.0, 7.0], [4.0, 2.0, 7.0]]
        )
        mean, std = data.mean(0), data.std(0)
        answer = (data - mean) / np.where(std == 0, 1, std)
        self.assertIn("Checks passed", check(data, mean, std, answer))
        cases = [
            (data.mean(1), data.std(1), answer),  # wrong axis
            (mean[None, :], std, answer),  # wrong statistic shape
            (mean, std, answer.T),  # swapped output axes
            (mean + 1, std, answer),  # incorrect statistics
            (mean, std, answer[::-1]),  # moments right, samples wrong
            (mean, std, answer + 1),
            (mean, std, np.full_like(answer, np.nan)),
            (mean, std, np.full_like(answer, np.inf)),
        ]
        for args in cases:
            with self.subTest(shapes=[a.shape for a in args]):
                with self.assertRaises(AssertionError):
                    check(data, *args)

    def test_standardization_rejects_wrong_axis_even_for_square_input(self):
        check = load_feedback("03")
        data = np.array([[1.0, 8.0, 3.0], [2.0, 4.0, 9.0], [7.0, 5.0, 6.0]])
        mean, std = data.mean(1), data.std(1)
        with self.assertRaises(AssertionError):
            check(data, mean, std, (data - mean[:, None]) / std[:, None])

    def test_transpose_checks_values_when_spatial_dimensions_match(self):
        check = load_feedback("04")
        photo = np.arange(12.0).reshape(2, 2, 3)
        chw = photo.transpose(2, 0, 1)
        self.assertIn("Checks passed", check(photo, chw))
        cases = [
            photo,
            photo.transpose(2, 1, 0),
            photo.reshape(3, 2, 2),
            chw + 1,
            np.full_like(chw, np.nan),
            np.full_like(chw, np.inf),
        ]
        for answer in cases:
            with self.subTest(shape=answer.shape):
                with self.assertRaises(AssertionError):
                    check(photo, answer)

    def test_contraction_preserves_batch_time_and_weighted_values(self):
        check = load_feedback("06")
        photo = np.arange(18.0).reshape(2, 3, 3)
        batch = np.stack([photo, photo * 2 + 5])
        weights = np.array([0.2, 0.5, 0.3])
        gray = np.einsum("hwc,c->hw", photo, weights)
        gray_batch = np.einsum("nhwc,c->nhw", batch, weights)
        self.assertIn("Checks passed", check(photo, batch, weights, gray, gray_batch))
        cases = [
            (gray.T, gray_batch),
            (gray, gray_batch.sum(axis=0)),
            ((photo * weights).sum(axis=1), gray_batch),  # same shape, wrong axis
            (photo.mean(axis=-1), gray_batch),
            (gray, gray_batch[::-1]),
            (gray + 1, gray_batch),
            (gray, np.full_like(gray_batch, np.nan)),
            (np.full_like(gray, np.inf), gray_batch),
        ]
        for single, multiple in cases:
            with self.subTest(single=single.shape, batch=multiple.shape):
                with self.assertRaises(AssertionError):
                    check(photo, batch, weights, single, multiple)


if __name__ == "__main__":
    unittest.main()
