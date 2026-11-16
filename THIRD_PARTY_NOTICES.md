# Third-party components and research sources

- Riskfolio-Lib 7.4.1 by Dany Cajas, BSD-3-Clause: installed in a separate quantitative research environment; not bundled into the Cloudflare Worker. https://github.com/dcajasn/Riskfolio-Lib/blob/master/LICENSE.txt . The package carries its copyright/license notices; requirements.txt pins its version. No endorsement implied.
- OpenAI skills quick_validate.py at commit 49f948faa9258a0c61caceaf225e179651397431: copied for component tests, Apache-2.0 license included in research/upstream.
- Anthropic skills aggregate_benchmark.py at commit 2c5958ecac7cee2b583967a2c4981d0f4a75c579: copied for component tests, Apache-2.0 license included in research/upstream.
- obra/superpowers and wshobson/agents: inspected public documentation/source, MIT metadata verified; no runtime plugin installed and no claim that its agent-level efficacy has been locally reproduced.
- Qlib/RD-Agent, AlphaSense, Quartr, RavenPack and Patsnap were researched as methodological or integration references. Their private implementations or licensed datasets have not been copied or connected by this release.
- SkillsBench https://arxiv.org/abs/2602.12670 and SWE-Skills-Bench https://arxiv.org/abs/2603.15401v1 are external research, labeled as preprints. Results are task/model/version-dependent and were not reproduced by our component checks.

Source files and reports record commit/file hashes, provenance and limitations. Availability of a public repository or an academic purpose is not blanket permission to use every third-party dataset or proprietary component.

- scikit-learn 1.8.0 (BSD-3-Clause) is used for the separate temporal-holdout prediction report: LogisticRegression, StandardScaler and HistGradientBoostingClassifier. No claim that this is Qlib or that it validates news-based predictions.
- The Worker uses an independent native HRP implementation, numerically compared with Riskfolio-Lib 7.4.1 on controlled fixtures (single linkage, no optimal leaf ordering). Riskfolio itself remains in the Python research environment. See reports/hrp-parity-v1.json and quantlab/verify_hrp_parity.py.
- SEC structured facts and official issuer documents retain source, filing/acquisition dates, units and period context. Public accessibility is not represented as a blanket commercial-display license for third-party market feeds.
