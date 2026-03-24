# Release Automation

This repo provides reusable GitHub Actions workflows and a Python script that automate versioning, PR creation, and GitHub Release publishing for any BCGov Arches project.

## Wiring into a Project

### 1. Prerequisites

**`pyproject.toml`** must have a `version` field and a `Development Status` classifier:

```toml
[project]
name = "your-project"
version = "1.0.0"
classifiers = [
    "Development Status :: 5 - Production/Stable",
    # ... other classifiers
]
```

**`PROJECT_PAT`** secret must be set in your repository's GitHub secrets. This must be a personal access token with `contents: write` and `pull-requests: write` access to the repository.

---

### 2. Add the workflow files

Create the following two files in your project's `.github/workflows/` directory.

**`.github/workflows/release_prep.yml`** — triggers on pushes to release branches, increments the version, and opens a PR:

```yaml
name: Prepare release

on:
  push:
    branches:
      - 'release_alpha'
      - 'release_beta'
      - 'release_patch'
      - 'release_minor'
      - 'release_major'

permissions:
  contents: write
  pull-requests: write

jobs:
  increment_version_and_pr:
    uses: bcgov/bcgov-arches-common/.github/workflows/release_prep_common.yml@main
    with:
      github-repo: <org>/<your-repo>
    secrets:
      token: ${{ secrets.PROJECT_PAT }}
```

Replace `<org>/<your-repo>` with your repository slug (e.g. `bcgov/bcrhp`).

---

**`.github/workflows/release_deploy.yml`** — triggers when a release prep PR is merged and publishes the GitHub Release:

```yaml
name: Release application to GitHub

on:
  pull_request:
    types: [closed]
    branches:
      - 'main'
      - 'dev/*'
      - 'release/*'

permissions:
  contents: write
  packages: write

jobs:
  release:
    if: >
      github.event.pull_request.merged == true &&
      startsWith(github.event.pull_request.title, 'on merge: github release of version')
    uses: bcgov/bcgov-arches-common/.github/workflows/release_deploy_common.yml@main
```

---

### 3. Create the release branches

The following long-lived branches must exist in your repository. They are never merged — they serve only as trigger targets:

```bash
git checkout -b release_alpha && git push origin release_alpha
git checkout -b release_beta  && git push origin release_beta
git checkout -b release_patch && git push origin release_patch
git checkout -b release_minor && git push origin release_minor
git checkout -b release_major && git push origin release_major
```

---

## Release Process

Pushing to a trigger branch increments the version, opens a PR, and publishes a GitHub Release when that PR is merged.

### Release Types

| Trigger branch   | Version behaviour                                  | Example                                            | Target branch |
|------------------|----------------------------------------------------|----------------------------------------------------|---------------|
| `release_alpha`  | Increments alpha number                            | `1.3.1a0` → `1.3.1a1`                             | `release/*`   |
| `release_beta`   | Increments beta number (or transitions from alpha) | `1.3.1a2` → `1.3.1b0`                             | `release/*`   |
| `release_patch`  | Increments patch (or finalizes pre-release)        | `1.3.0` → `1.3.1` / `1.3.1b1` → `1.3.1`          | `main`        |
| `release_minor`  | Increments minor (or finalizes pre-release)        | `1.3.1` → `1.4.0` / `1.4.0b1` → `1.4.0`          | `main`        |
| `release_major`  | Increments major (or finalizes pre-release)        | `1.4.0` → `2.0.0` / `2.0.0a1` → `2.0.0`          | `main`        |

### How It Works

1. **Set the initial version** — for a new pre-release cycle, manually set the starting version in `pyproject.toml` to signal the scope (e.g. `1.3.1a0` for a patch alpha, `1.4.0a0` for a minor alpha)
2. **Push to a trigger branch** — the workflow reads both the latest GitHub Release and the current `pyproject.toml` version, uses whichever is higher as the base, and increments from there
3. **A PR is opened automatically** — targeting the appropriate branch (`release/*` for alpha/beta, `main` for patch/minor/major), titled `on merge: github release of version X.Y.Z`
4. **Review and merge the PR** — once merged, the release workflow builds the package and publishes a GitHub Release with the wheel and sdist attached

### Version Transition Scenarios

#### Starting a new pre-release cycle from stable

The automation cannot automatically determine whether a new cycle should be a patch, minor, or major — you must set this manually once at the start.

Starting point: latest release is `1.3.0`, you want to begin testing a `1.3.1` patch alpha.

1. Create a `release/1.3.1` branch from `main` (this becomes the PR target for all alpha/beta releases in this cycle)
2. Set the initial version in `pyproject.toml` on `release_alpha`:
   ```bash
   git checkout release_alpha
   git merge main
   # Edit pyproject.toml: set version = "1.3.1a0"
   git add pyproject.toml
   git commit -m "Set initial alpha version 1.3.1a0"
   git push origin release_alpha
   ```
3. The automation sees `1.3.1a0` in `pyproject.toml` (higher than the last release `1.3.0`), increments to `1.3.1a1`, and opens a PR targeting `release/1.3.1`
4. Merge the PR — a `v1.3.1a1` GitHub Release is published

For a minor alpha instead, set `version = "1.4.0a0"` in step 2 and create a `release/1.4.0` branch.

Subsequent alpha pushes require no manual version changes: `1.3.1a1` → `1.3.1a2` → etc.

---

#### Transitioning from alpha to beta

No manual version change needed — the automation detects the pre-release type change automatically.

Starting point: latest release is `1.3.1a2`, ready for beta.

1. Push your changes to `release_beta`:
   ```bash
   git checkout release_beta
   git merge <your-feature-branch>
   git push origin release_beta
   ```
2. The automation detects `1.3.1a2`, keeps the same base version, and produces `1.3.1b0`
3. A PR is opened targeting `release/1.3.1` — merge it to publish `v1.3.1b0`

Subsequent beta pushes increment automatically: `1.3.1b0` → `1.3.1b1` → etc.

---

#### Finalizing a pre-release to stable

No manual version change needed — the automation detects the existing pre-release and removes the suffix.

Starting point: latest release is `1.3.1b1`, ready to ship.

1. Push to `release_patch`:
   ```bash
   git checkout release_patch
   git merge <your-feature-branch>
   git push origin release_patch
   ```
2. The automation detects `1.3.1b1` is a pre-release and finalizes it to `1.3.1`
3. A PR is opened targeting `main` — merge it to publish `v1.3.1`

The same finalization logic applies to minor and major pre-releases:
- `1.4.0b1` + `release_minor` → `1.4.0`
- `2.0.0a1` + `release_major` → `2.0.0`

---

#### Stable patch / minor / major (no pre-release)

No manual version change needed.

```bash
git checkout release_patch   # or release_minor / release_major
git merge <your-feature-branch>
git push origin release_patch
```

The automation increments from the latest GitHub Release and targets `main`.

---

#### After pushing

1. Go to the **Actions** tab to monitor the `Prepare release` workflow
2. Once it completes, go to **Pull Requests** to find the auto-generated PR
3. Review the version bump in `pyproject.toml`, then merge the PR
4. The `Release application to GitHub` workflow runs automatically on merge
5. Go to **Releases** to confirm the new release was published with artifacts

### Notes

- The automation uses whichever is higher — the latest GitHub Release or the current `pyproject.toml` version — as the base for incrementing. Set `pyproject.toml` manually only when starting a new pre-release cycle to signal scope (patch/minor/major)
- If the `Prepare release` workflow runs but no PR appears, check the Actions log for errors
- If a PR already exists for a trigger branch, the workflow will skip PR creation and exit cleanly — merge or close the existing PR first
- The release notes are auto-generated by GitHub based on PRs merged into the target branch since the previous release
