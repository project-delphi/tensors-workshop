"""The audio stage prints NumPy under every picture. This runs it.

`interactive/voice-scenes/*.js` builds each block from `ctx.state`, so a
number in the code can never disagree with the number in the readout beside
it -- `tests/voice_scenes.test.cjs` pins that much. What it cannot pin is
whether the *expression* does what the comment says: `npm test` has no NumPy,
so nothing there would notice if `np.fft.rfft` gave a different bin count than
the comment claims, or if the window convention were the wrong one.

So this file runs the non-obvious lines for real, at the values the stage
opens on, and asserts they produce the shapes and the numbers the page
prints. The arithmetic it compares against is `interactive/audio-core.js`'s,
restated here rather than imported -- the point is that two independent
statements of the same operation agree.
"""

import unittest

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

# The recording the stage ships, and the controls' opening values.
SAMPLES = 237568
RATE = 48000
N = 1024
HOP = 512


def audio_core_stft_shape(length, n, hop):
    """`stftShape` in audio-core.js: N/2 zeros each end, then whole hops."""
    padded = length + 2 * (n >> 1)
    return (n >> 1) + 1, (padded - n) // hop + 1, padded


class WindowConvention(unittest.TestCase):
    def test_hann_is_periodic_not_symmetric(self):
        # audio-core.js: w[i] = 0.5 - 0.5*cos(2*pi*i/N). np.hanning(N) is the
        # SYMMETRIC window, 0.5 - 0.5*cos(2*pi*i/(N-1)), which is a different
        # array -- hence the N + 1 and the [:-1] in the printed code.
        core = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(N) / N)
        printed = np.hanning(N + 1)[:-1]
        np.testing.assert_allclose(printed, core, atol=1e-15)
        self.assertFalse(np.allclose(np.hanning(N), core, atol=1e-6))

    def test_hamming_is_periodic_too(self):
        core = 0.54 - 0.46 * np.cos(2 * np.pi * np.arange(N) / N)
        np.testing.assert_allclose(np.hamming(N + 1)[:-1], core, atol=1e-15)


class TheHopScene(unittest.TestCase):
    """`#window`: np.pad, sliding_window_view, rfft -- the widest block."""

    def test_the_printed_lines_give_the_shapes_the_page_prints(self):
        f, t, padded = audio_core_stft_shape(SAMPLES, N, HOP)
        self.assertEqual((f, t, padded), (513, 465, 238592))

        x = np.zeros(SAMPLES, dtype=np.float32)
        w = np.hanning(N + 1)[:-1]
        xp = np.pad(x, N // 2)
        s = sliding_window_view(xp, N)[::HOP]
        big_x = np.fft.rfft(s * w, axis=-1).T

        self.assertEqual(xp.shape, (padded,))
        self.assertEqual(s.shape, (t, N))
        self.assertEqual(big_x.shape, (f, t))

    def test_the_frames_matrix_really_is_a_view(self):
        # The claim in the comment, and the reason the equation says the
        # frames matrix computes nothing.
        xp = np.pad(np.zeros(SAMPLES), N // 2)
        s = sliding_window_view(xp, N)[::HOP]
        self.assertIsNotNone(s.base)
        self.assertFalse(s.flags["OWNDATA"])

    def test_every_overlap_on_the_control_holds(self):
        for hop in (N, N // 2, N // 4):
            f, t, padded = audio_core_stft_shape(SAMPLES, N, hop)
            s = sliding_window_view(np.pad(np.zeros(SAMPLES), N // 2), N)[::hop]
            self.assertEqual(s.shape, (t, N), f"hop {hop}")
            self.assertEqual(np.fft.rfft(s[0]).shape, (f,), f"hop {hop}")

    def test_every_window_size_on_the_control_holds(self):
        for n in (256, 512, 1024, 2048):
            f, t, _ = audio_core_stft_shape(SAMPLES, n, n >> 1)
            s = sliding_window_view(np.pad(np.zeros(SAMPLES), n // 2), n)[:: n >> 1]
            self.assertEqual(s.shape, (t, n), f"N {n}")
            self.assertEqual(np.fft.rfft(s[0]).shape, (f,), f"N {n}")


class TheTransformScene(unittest.TestCase):
    """`#spectrum`: fft against rfft, and the rebuild from k bins."""

    def test_fft_gives_n_bins_and_rfft_the_half_the_matrix_keeps(self):
        xt = np.zeros(N)
        self.assertEqual(np.fft.fft(xt).shape, (N,))
        self.assertEqual(np.fft.rfft(xt).shape, ((N >> 1) + 1,))

    def test_keeping_every_bin_returns_the_frame_exactly(self):
        # The scene's own claim: at k = N/2 + 1 the rebuilt line lies on the
        # frame, because nothing was approximated.
        rng = np.random.default_rng(0)
        xt = rng.standard_normal(N) * np.hanning(N + 1)[:-1]
        big_x = np.fft.rfft(xt)
        mag = np.abs(big_x)
        keep = np.argsort(mag)[-((N >> 1) + 1) :]
        y = np.zeros_like(big_x)
        y[keep] = big_x[keep]
        np.testing.assert_allclose(np.fft.irfft(y, n=N), xt, atol=1e-12)

    def test_keeping_one_bin_does_not(self):
        rng = np.random.default_rng(0)
        xt = rng.standard_normal(N) * np.hanning(N + 1)[:-1]
        big_x = np.fft.rfft(xt)
        keep = np.argsort(np.abs(big_x))[-1:]
        y = np.zeros_like(big_x)
        y[keep] = big_x[keep]
        self.assertGreater(np.abs(np.fft.irfft(y, n=N) - xt).max(), 0.1)


class TheRoundingScene(unittest.TestCase):
    """`#quantize`: np.clip(np.round(...)) is audio-core's `quantize`."""

    def test_the_clip_is_not_decoration(self):
        half = 2 ** (16 - 1)
        # One sample at exactly +1.0 rounds to a code int16 has no room for.
        x = np.array([1.0])
        self.assertEqual(np.round(x * half)[0], half)
        self.assertEqual(np.clip(np.round(x * half), -half, half - 1)[0], half - 1)

    def test_every_bit_depth_on_the_control_gives_2_to_the_b_levels(self):
        rng = np.random.default_rng(1)
        x = rng.uniform(-1, 1, 20000)
        for b in range(2, 17):
            half = 2 ** (b - 1)
            codes = np.clip(np.round(x * half), -half, half - 1)
            self.assertLessEqual(np.unique(codes).size, 2 * half, f"{b} bits")
            self.assertAlmostEqual(1 / half, 2.0 ** -(b - 1), places=12)


class TheLayoutScene(unittest.TestCase):
    """`#scramble`: both reorderings are permutations of the same numbers."""

    F = 513
    PATCH = 27

    def test_transpose_moves_no_number(self):
        z = np.arange(self.F * self.F).reshape(self.F, self.F)
        self.assertIsNotNone(z.T.base)
        self.assertEqual(sorted(z.T.ravel().tolist()), sorted(z.ravel().tolist()))

    def test_the_patch_shuffle_swaps_the_block_axes_only(self):
        g = self.F // self.PATCH
        self.assertEqual(g * self.PATCH, self.F)
        z = np.arange(self.F * self.F).reshape(self.F, self.F)
        y = z.reshape(g, self.PATCH, g, self.PATCH)
        y = y.transpose(2, 1, 0, 3).reshape(self.F, self.F)

        # audio-core.js's patchShuffle, written out.
        want = np.zeros_like(z)
        for pi in range(g):
            for pj in range(g):
                block = z[
                    pi * self.PATCH : (pi + 1) * self.PATCH,
                    pj * self.PATCH : (pj + 1) * self.PATCH,
                ]
                want[
                    pj * self.PATCH : (pj + 1) * self.PATCH,
                    pi * self.PATCH : (pi + 1) * self.PATCH,
                ] = block
        np.testing.assert_array_equal(y, want)
        self.assertEqual(y.size, z.size)


class TheFactorisationScenes(unittest.TestCase):
    """`#lowrank` and `#nmf`: the shapes, and the inequality between them."""

    F, T = 60, 40  # the real matrix is 513 x 465; the claim is about shapes

    def test_the_thin_svd_shapes_are_the_ones_printed(self):
        z = np.random.default_rng(2).standard_normal((self.F, self.T))
        u, sv, vt = np.linalg.svd(z, full_matrices=False)
        r = min(self.F, self.T)
        self.assertEqual(
            (u.shape, sv.shape, vt.shape), ((self.F, r), (r,), (r, self.T))
        )

    def test_rank_k_keeps_k_components_and_its_share_of_the_energy(self):
        z = np.random.default_rng(3).standard_normal((self.F, self.T))
        u, sv, vt = np.linalg.svd(z, full_matrices=False)
        for k in (2, 5, 10):
            zk = (u[:, :k] * sv[:k]) @ vt[:k]
            self.assertEqual(zk.shape, z.shape)
            self.assertEqual(np.linalg.matrix_rank(zk), k)
            kept = (sv[:k] ** 2).sum() / (sv**2).sum()
            self.assertTrue(0 < kept < 1)

    def test_the_svd_error_the_nmf_scene_prints_is_the_tail(self):
        # `svdError` in nmf.js is sqrt(tail)/||V||; the printed line is
        # sqrt((sv[k:]**2).sum() / (sv**2).sum()). They are the same number.
        v = np.abs(np.random.default_rng(4).standard_normal((self.F, self.T)))
        sv = np.linalg.svd(v, compute_uv=False)
        for k in (2, 3, 4):
            u, s2, vt = np.linalg.svd(v, full_matrices=False)
            vk = (u[:, :k] * s2[:k]) @ vt[:k]
            direct = np.linalg.norm(v - vk) / np.linalg.norm(v)
            printed = np.sqrt((sv[k:] ** 2).sum() / (sv**2).sum())
            self.assertAlmostEqual(direct, printed, places=10)


class TheBatchScene(unittest.TestCase):
    """`#batch`: the crop is why np.stack works, and [:, None] is the channel."""

    def test_stack_refuses_a_ragged_list(self):
        clips = [np.zeros((513, 465)), np.zeros((513, 400))]
        with self.assertRaises(ValueError):
            np.stack(clips)

    def test_the_crop_makes_it_stackable_and_none_adds_the_channel(self):
        clips = [np.zeros((513, 465)), np.zeros((513, 400)), np.zeros((513, 470))]
        crop = min(c.shape[1] for c in clips)
        cropped = [c[:, :crop] for c in clips]
        t = np.stack(cropped)
        self.assertEqual(t.shape, (3, 513, crop))
        self.assertEqual(t[:, None].shape, (3, 1, 513, crop))


if __name__ == "__main__":
    unittest.main()
