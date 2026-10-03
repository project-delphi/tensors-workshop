# The datasets' fallback copies

Every file here is a copy of a dataset a notebook downloads from someone else's
host. The notebook tries that host first and falls back to this copy, served
from the published site at
`https://project-delphi.github.io/tensors-workshop/data/<name>`, when the host
does not answer. A host that is down, slow or rate-limiting on the day then
costs a retry, not a section.

Two files carry a SHA-256 the notebooks already pinned, and the notebooks check
it against whichever source answered, so a copy here can never pass for
something else. The CSVs have no pin: upstream serves them from a branch, and
the notebooks' own shape assertions are what would notice a change.

Refresh any of them with the standard library alone:

```bash
python3 scripts/fetch_mirrors.py            # every file
python3 scripts/fetch_mirrors.py storm.webm # just this one
```

It prints the `sha256` and `bytes` lines below. Check 4 in `check_links.py`
fails the build if a notebook names a copy that is not here, and `data/**` is
in `resources:` so each one reaches `docs/`.

## In the room

These back the live cores, so they matter on the day.

| File | Used by | Source | Terms |
|---|---|---|---|
| `housing.csv` | 00, 07 | `raw.githubusercontent.com/ageron/handson-ml2/master/datasets/housing/housing.csv` | California housing, from the 1990 US census via StatLib; the repository is Apache-2.0 |
| `taxis.csv` | 00, 10, 11 | `raw.githubusercontent.com/mwaskom/seaborn-data/master/taxis.csv` | NYC TLC trip records, public data; seaborn-data says its files "may change or be removed at any time" |
| `flights.csv` | 00, 08, 09 | `raw.githubusercontent.com/mwaskom/seaborn-data/master/flights.csv` | Box & Jenkins monthly airline passengers, 1949–1960 |
| `storm.webm` | 00 (1 KB probe), 02, 05, 11 (extension) | `upload.wikimedia.org/wikipedia/commons/1/1e/Tormenta_en_l%27Almadrava.webm` | "Tormenta en l'Almadrava" by Nicolas Vigier, CC0 |

```
housing.csv  sha256 8a3727f4cf54ac1a327f69b1d5b4db54c5834ea81c6e4efc0d163300022a685e  bytes 1423529
taxis.csv    sha256 08d6d71784dbaa2651fee37fc03389754194c05d72d2d19cbc2c799dea6ac09d  bytes 869349
flights.csv  sha256 237d834127d9c6355630d8f443a7a2377b5925923010009b59809ba0b67f4fac  bytes 2350
fetched 2026-09-27
storm.webm   sha256 e377fcdd2c79b55bce13c2c24b5dd7e412af39cd400eec548a79d0e59d79dc1b  (pinned in 02, 05, 11)
```

## Take-home

| File | Used by | Source | Terms |
|---|---|---|---|
| `landsat.zip` | 16 | `archive.ics.uci.edu/static/public/146/statlog+landsat+satellite.zip` | Statlog (Landsat Satellite), UCI Machine Learning Repository, CC BY 4.0 |
| `chicago-crime-2023.csv` | 15 | notebook 15's own aggregate query to `data.cityofchicago.org` (the script reads it out of the notebook) | City of Chicago open data; counts only, no records |

```
landsat.zip  sha256 7c54e0e11c872a1b0b647da370d596dcb06746159cce4121d92ccd70b7d7ce3c  (pinned in 16)
```

## Deep dive 19

The blog post's cached data, from `project-delphi/ml-blog` at the commit the
notebook pins (`d9f634c`); that repository is MIT for code and CC BY 4.0 for
writing. The notebook checks each file's SHA-256 whichever source answers.

| File | What it is |
|---|---|
| `resnet18_layer3_1_conv2.npy` | A trained ResNet-18 kernel, `layer3.1.conv2` |
| `sweep_cp_seed0.csv`, `sweep_cp_seed1.csv`, `sweep_cp_seed2.csv` | The post's CP budget sweeps, three seeds |
| `sweep_tucker2.csv` | The post's Tucker-2 budget sweep |

```
resnet18_layer3_1_conv2.npy  sha256 2ace0a79d66e0d1ed2239639269df7f831122100033483a41779b760202e7df5  bytes 2359424
sweep_cp_seed0.csv           sha256 f5fb2d3eb3a1ceb09608c12a2c48513dd9f59a411489a7063c2dc8b192e1e832  bytes 394
sweep_cp_seed1.csv           sha256 6adfe63c99a8749f99418a581cf66f1476dbb924f9f0bddc33e99d0acf7e8780  bytes 396
sweep_cp_seed2.csv           sha256 6b942cafbace76f821ff96ab2c130a2af69ea5b4a1866a524bbc14611ceddd89  bytes 396
sweep_tucker2.csv            sha256 1a3fb982baa9ce1e8ff2c0a3ff75aca31b7f59f5a3af97e9bb423a7f2f268cfe  bytes 8970
fetched 2026-09-27
```

## Deep dive 20

The factorisations DeepMind published with the AlphaTensor paper, from
`github.com/google-deepmind/alphatensor` at the commit the notebook pins
(`1949163`), folder `algorithms/`. Copyright 2022 DeepMind Technologies
Limited. That repository licenses its software under Apache-2.0 and its other
materials under CC BY 4.0; both permit redistribution with attribution, the two
files here are unmodified, and `alphatensor.LICENSE` beside them is the
repository's own `LICENSE` file. Cite the paper: Fawzi, A. et al. (2022),
*Discovering faster matrix multiplication algorithms with reinforcement
learning*, Nature 610, 47–53, `doi.org/10.1038/s41586-022-05172-4`. The
notebook checks each file's SHA-256 whichever source answers.

| File | What it is |
|---|---|
| `factorizations_r.npz` | 93 sizes, in standard arithmetic: for each `a,b,c`, three arrays whose columns are the rank-one terms |
| `factorizations_f2.npz` | 20 sizes, in arithmetic modulo 2, same layout |
| `alphatensor.LICENSE` | The Apache-2.0 text, as that repository ships it |

```
factorizations_r.npz   sha256 4d59571a2537a9472e8229176d5ebe2925f3e041ad403c095b41853026caec33  bytes 746206
factorizations_f2.npz  sha256 70f09f349d8d2874ef0e0e089459c7320f5aa3eef277df5ffa67f573709db2da  bytes 16021
fetched 2026-10-03
```

**Not copied: notebook 19's FB15k-237 training split**
(`github.com/ibalazevic/TuckER`, from Microsoft Research's release). TuckER's
MIT licence covers its code; neither the dataset's own README nor its download
page states terms for the data, so there is nothing that plainly permits
redistributing it. The notebook keeps its retries.

**Not copied: notebook 14's monkey BMI tensor**
(`gitlab.com/tensors/tensor_data_monkey_bmi`). Its repository carries no
licence, so there is nothing that permits redistributing it. Notebook 14 keeps
its three retries and its bilingual failure message instead.
