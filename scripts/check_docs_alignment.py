"""
文档对齐门禁脚本。

目标：
1. 识别当前工作区/暂存区的代码改动
2. 根据改动类型推导必须同步更新的文档
3. 缺失时直接失败，供 pre-commit / CI 作为强制门禁

用法：
  python scripts/check_docs_alignment.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Iterable


PROJECT_ROOT = Path(__file__).resolve().parent.parent

CANONICAL_DOCS = {
    "STATUS": Path("STATUS.md"),
    "DEVELOPMENT_LOG": Path("DEVELOPMENT_LOG.md"),
    "BUG_LOG": Path("docs/BUG_LOG.md"),
    "ARCHITECTURE": Path("docs/specs/ARCHITECTURE.md"),
    "UI_SPEC": Path("docs/specs/UI_SPEC.md"),
    "MOBILE_UI_SPEC": Path("docs/specs/MOBILE_UI_SPEC.md"),
    "TEST_STRATEGY": Path("docs/specs/TEST_STRATEGY.md"),
    "API_CONTRACT": Path("docs/specs/API_CONTRACT.md"),
    "MOBILE_API_CONTRACT": Path("docs/specs/MOBILE_API_CONTRACT.md"),
    "DATABASE_SCHEMA": Path("docs/specs/DATABASE_SCHEMA.md"),
}


def run_git(*args: str) -> list[str]:
    result = subprocess.run(
        ["git", *args],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return []
    return [line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip()]


def get_changed_files() -> set[str]:
    files = set()
    files.update(run_git("diff", "--name-only"))
    files.update(run_git("diff", "--cached", "--name-only"))
    files.update(run_git("ls-files", "--others", "--exclude-standard"))
    return files


def path_matches(file_path: str, prefixes: Iterable[str], suffixes: Iterable[str] = ()) -> bool:
    normalized = file_path.replace("\\", "/")
    return any(normalized.startswith(prefix) for prefix in prefixes) or any(
        normalized.endswith(suffix) for suffix in suffixes
    )


def read_file(relative_path: str) -> str:
    path = PROJECT_ROOT / relative_path
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def is_doc_file(file_path: str) -> bool:
    return file_path.endswith(".md")


def is_code_file(file_path: str) -> bool:
    code_suffixes = (
        ".py",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".json",
        ".yml",
        ".yaml",
        ".sql",
        ".sh",
        ".kt",
        ".gradle",
        ".properties",
    )
    return file_path.endswith(code_suffixes)


def detect_required_docs(changed_files: set[str]) -> tuple[set[str], list[str]]:
    required: set[str] = set()
    reasons: list[str] = []

    code_files = {f for f in changed_files if is_code_file(f) and not is_doc_file(f)}
    if code_files:
        required.update({"STATUS", "DEVELOPMENT_LOG"})
        reasons.append("存在代码/配置改动，必须同步更新 STATUS.md 和 DEVELOPMENT_LOG.md")

    if any(path_matches(f, ("backend/app/routers/", "backend/app/services/", "backend/app/schemas/")) for f in changed_files):
        required.add("API_CONTRACT")
        reasons.append("后端接口/服务改动，必须同步更新 API_CONTRACT.md")

    if any(path_matches(f, ("backend/app/models/", "backend/app/db/", "backend/alembic/"), (".sql",)) for f in changed_files):
        required.add("DATABASE_SCHEMA")
        reasons.append("数据模型/Schema 改动，必须同步更新 DATABASE_SCHEMA.md")

    if any(path_matches(f, ("frontend/src/app/", "frontend/src/components/", "frontend/src/hooks/")) for f in changed_files):
        required.add("UI_SPEC")
        reasons.append("Web 页面/组件改动，必须同步更新 UI_SPEC.md")

    if any(path_matches(f, ("mobile_app/src/app/", "mobile_app/src/components/", "mobile_app/src/hooks/")) for f in changed_files):
        required.add("MOBILE_UI_SPEC")
        reasons.append("移动端页面/组件改动，必须同步更新 MOBILE_UI_SPEC.md")

    if any(path_matches(f, ("mobile_app/src/api/", "mobile_app/src/config/")) for f in changed_files):
        required.add("MOBILE_API_CONTRACT")
        reasons.append("移动端 API/配置改动，必须同步更新 MOBILE_API_CONTRACT.md")

    if any(path_matches(f, ("tests/", "frontend/e2e/", "mobile_app/src/__tests__/", "mcp-tests/")) for f in changed_files):
        required.add("TEST_STRATEGY")
        reasons.append("测试或回归用例改动，必须同步更新 TEST_STRATEGY.md")

    if any(path_matches(f, ("infra/",), ("Dockerfile", "docker-compose.yml", "app.json", "settings.gradle", "build.gradle", "gradle.properties")) for f in changed_files):
        required.add("ARCHITECTURE")
        reasons.append("构建/部署/工程结构改动，必须同步更新 ARCHITECTURE.md")

    regression_content_hit = any(
        "BUG-REGRESSION" in read_file(f)
        for f in changed_files
        if path_matches(f, ("tests/", "frontend/e2e/", "mobile_app/src/__tests__/")) and f.endswith((".ts", ".tsx", ".py"))
    )
    if regression_content_hit:
        required.add("BUG_LOG")
        reasons.append("检测到明确的 BUG-REGRESSION 测试改动，必须同步更新 BUG_LOG.md")

    return required, reasons


def main() -> int:
    changed_files = get_changed_files()
    print("=" * 60)
    print("Docs Alignment Gate")
    print("=" * 60)

    if not changed_files:
        print("No changed files detected, skip.")
        return 0

    required_docs, reasons = detect_required_docs(changed_files)
    changed_set = {Path(f) for f in changed_files}
    missing = [name for name in sorted(required_docs) if CANONICAL_DOCS[name] not in changed_set]

    print("Changed files:")
    for file_path in sorted(changed_files):
        print(f"  - {file_path}")

    if reasons:
        print("\nDetected rules:")
        for reason in reasons:
            print(f"  - {reason}")

    if missing:
        print("\n[FAIL] Missing required doc updates:")
        for doc_name in missing:
            print(f"  - {CANONICAL_DOCS[doc_name]}")
        print("\nCanonical docs:")
        for doc_name, path in CANONICAL_DOCS.items():
            print(f"  - {doc_name}: {path}")
        return 1

    print("\n[PASS] Docs alignment gate passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
