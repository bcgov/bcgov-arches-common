import os
import requests
from pathlib import Path
from packaging.version import Version
from pyproject_parser import PyProject


def _auth_headers() -> dict:
    headers = {"Accept": "application/vnd.github+json"}
    token = os.getenv("GH_API_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _get_all_releases(repo: str):
    """Return all GitHub Release tags as Version objects for *repo*."""
    url = f"https://api.github.com/repos/{repo}/releases"
    resp = requests.get(
        url, headers=_auth_headers(), params={"per_page": 100}, timeout=10
    )
    if resp.status_code == 404:
        return []
    resp.raise_for_status()
    versions = []
    for release in resp.json():
        tag = release["tag_name"].lstrip("v")
        try:
            versions.append(Version(tag))
        except Exception:
            pass
    return versions


def get_latest_version_for_base(repo: str, base: str) -> Version:
    """Return the highest GitHub Release whose base version matches *base* (e.g. '2.0.0').
    Used to support concurrent pre-release streams without cross-stream pollution."""
    matching = [v for v in _get_all_releases(repo) if v.base_version == base]
    return max(matching) if matching else None


def get_latest_version_for_minor_stream(repo: str, major: int, minor: int) -> Version:
    """Return the highest stable GitHub Release matching major.minor.*.
    Used to support concurrent stable streams (e.g. 2.1.x while 2.2.x is active)."""
    matching = [
        v
        for v in _get_all_releases(repo)
        if v.major == major and v.minor == minor and not v.pre
    ]
    return max(matching) if matching else None


def increment_version(current: Version, branch: str) -> str:
    if not current:
        current = Version(f"0.0.0")

    if "alpha" in branch or "beta" in branch:
        pre = "a" if "alpha" in branch else "b"
        if current.pre and current.pre[0] == pre:
            # Same pre-release type: increment pre-release number
            return Version(
                f"{current.base_version}{current.pre[0]}{current.pre[1] + 1}"
            )
        elif current.pre:
            # Transitioning pre-release type (e.g. alpha → beta): keep same base version
            return Version(f"{current.base_version}{pre}0")
        else:
            raise ValueError(
                f"Cannot determine pre-release version from stable {current}. "
                "Manually set the initial pre-release version in pyproject.toml "
                "(e.g. 1.3.1a0 for a patch alpha, 1.4.0a0 for a minor alpha) "
                "before pushing to this branch."
            )
    else:
        match branch:
            case "release_major":
                if current.pre and current.minor == 0 and current.micro == 0:
                    # Finalizing a major pre-release (e.g. 2.0.0a1 → 2.0.0)
                    return Version(current.base_version)
                return Version(f"{current.major + 1}.{0}.{0}")
            case "release_minor":
                if current.pre and current.micro == 0:
                    # Finalizing a minor pre-release (e.g. 1.4.0b1 → 1.4.0)
                    return Version(current.base_version)
                return Version(f"{current.major}.{current.minor + 1}.{0}")
            case "release_patch":
                if current.pre:
                    # Finalizing a patch pre-release (e.g. 1.3.1b1 → 1.3.1)
                    return Version(current.base_version)
                return Version(f"{current.major}.{current.minor}.{current.micro + 1}")
            case _:
                raise ValueError("Unable to identify release version")


def update_pyproject():
    toml_file = Path("pyproject.toml")
    pyproject = PyProject.load(toml_file)
    current_branch = os.getenv("BRANCH_NAME")

    match current_branch:
        case "release_alpha":
            dev_status = "Development Status :: 3 - Alpha"
        case "release_beta":
            dev_status = "Development Status :: 4 - Beta"
        case _:
            dev_status = "Development Status :: 5 - Production/Stable"

    dev_status_index = next(
        (
            idx
            for idx, string in enumerate(pyproject.project["classifiers"])
            if "Development Status" in string
        ),
        0,
    )
    pyproject.project["classifiers"][dev_status_index] = dev_status
    github_repo = os.getenv("GITHUB_REPO")
    if not github_repo:
        raise ValueError(
            "GITHUB_REPO environment variable must be set (e.g. bcgov/bcrhp)"
        )
    current_toml_version = Version(str(pyproject.project["version"]))
    if current_toml_version.pre:
        # Pre-release in pyproject.toml signals explicit developer intent for this stream.
        # Query only releases matching this base version to avoid cross-stream pollution
        # (e.g. 2.1.0a5 should not affect the 2.0.0 stream).
        stream_version = get_latest_version_for_base(
            github_repo, current_toml_version.base_version
        )
        base_version = (
            max(stream_version, current_toml_version)
            if stream_version
            else current_toml_version
        )
    else:
        # Stable release: scope lookup to same major.minor to avoid cross-stream pollution
        # (e.g. 2.2.0 should not affect a 2.1.x patch stream).
        stream_version = get_latest_version_for_minor_stream(
            github_repo, current_toml_version.major, current_toml_version.minor
        )
        base_version = (
            max(stream_version, current_toml_version)
            if stream_version
            else current_toml_version
        )
    pyproject.project["version"] = increment_version(base_version, current_branch)
    pyproject.dump(toml_file)
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        print(f"new_version={pyproject.project["version"]}", file=output)


if __name__ == "__main__":
    update_pyproject()
