"""Exercise the learner checker without executing a folded solution."""

import json
import unittest
from pathlib import Path

import numpy as np
from scipy import signal

NOTEBOOK = (
    Path(__file__).resolve().parents[1]
    / "notebooks/13-convolution-and-deconvolution.ipynb"
)


class ConvolutionFeedback(unittest.TestCase):
    def setUp(self):
        self.notebook = json.loads(NOTEBOOK.read_text())
        self.patch = np.arange(20.0).reshape(4, 5)
        self.kernel = np.array([[1.0, 2.0], [3.0, 4.0]])
        self.scanline = np.array([1.0, 2.0, 4.0])
        self.kernel_1d = np.array([1.0, 0.0, -1.0])
        namespace = dict(
            np=np,
            signal=signal,
            patch=self.patch,
            sobel_x=self.kernel,
            scanline=self.scanline,
            kernel_1d=self.kernel_1d,
        )
        checker = next(c for c in self.notebook["cells"] if c["id"] == "p13-feedback")
        exec("".join(checker["source"]), namespace)
        self.check = namespace["check_convolution"]
        self.corr = signal.correlate2d(self.patch, self.kernel, mode="valid")
        self.conv = signal.convolve2d(self.patch, np.flip(self.kernel), mode="valid")
        # Explicit shifted columns provide an independent matrix construction.
        self.matrix = np.array(
            [
                [1.0, 0.0, 0.0],
                [0.0, 1.0, 0.0],
                [-1.0, 0.0, 1.0],
                [0.0, -1.0, 0.0],
                [0.0, 0.0, -1.0],
            ]
        )
        self.via_matrix = self.matrix @ self.scanline
        self.via_conv = np.convolve(self.scanline, self.kernel_1d, mode="full")
        self.modes = {
            m: signal.correlate2d(self.patch, self.kernel, mode=m)
            for m in ("valid", "same", "full")
        }

    def args(self):
        return [self.corr, self.conv, self.via_matrix, self.via_conv, self.modes]

    def test_accepts_correct_student_arrays(self):
        self.assertTrue(self.check(*self.args()))

    def test_rejects_unflipped_asymmetric_kernel(self):
        args = self.args()
        args[1] = signal.convolve2d(self.patch, self.kernel, mode="valid")
        with self.assertRaisesRegex(AssertionError, "kernel orientation"):
            self.check(*args)

    def test_rejects_matching_but_wrong_arrays(self):
        args = self.args()
        args[0] = args[1] = np.zeros_like(self.corr)
        with self.assertRaisesRegex(AssertionError, "corr: values differ"):
            self.check(*args)

    def test_rejects_each_shape_error(self):
        for i in range(4):
            args = self.args()
            args[i] = np.asarray(args[i])[..., None]
            with (
                self.subTest(argument=i),
                self.assertRaisesRegex(AssertionError, "output shape"),
            ):
                self.check(*args)
        args = self.args()
        args[4] = dict(self.modes, full=self.corr)
        with self.assertRaisesRegex(AssertionError, "full: check output shape"):
            self.check(*args)

    def test_rejects_wrong_toeplitz_values(self):
        args = self.args()
        args[2] = -self.via_matrix
        with self.assertRaisesRegex(AssertionError, "shifted matrix columns"):
            self.check(*args)

    def test_prediction_precedes_explanations(self):
        ids = [c["id"] for c in self.notebook["cells"]]
        for explanation in ("p09-plain-idea", "p13-cube", "p09-modes"):
            self.assertLess(
                ids.index("p09-predict-kernel-flip"), ids.index(explanation)
            )
            self.assertLess(ids.index("s09-05"), ids.index(explanation))
        self.assertLess(ids.index("p13-feedback"), ids.index("p13-learning-loop"))


if __name__ == "__main__":
    unittest.main()
