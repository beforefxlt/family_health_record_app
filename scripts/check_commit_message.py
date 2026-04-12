"""
检查 git commit message 是否包含中文。

用法：
  python scripts/check_commit_message.py .git/COMMIT_EDITMSG
  python scripts/check_commit_message.py --message "修复：移动端闪退"
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


CHINESE_RE = re.compile(r"[\u4e00-\u9fff]")
IGNORED_PREFIXES = ("Merge ", "Revert ")


def load_message(args: argparse.Namespace) -> str:
    if args.message is not None:
        return args.message.strip()
    if not args.commit_msg_file:
        return ""
    content = Path(args.commit_msg_file).read_text(encoding="utf-8", errors="ignore")
    return content.splitlines()[0].strip() if content else ""


def main() -> int:
    parser = argparse.ArgumentParser(description="检查 commit message 是否使用中文")
    parser.add_argument("commit_msg_file", nargs="?", help="git commit message file path")
    parser.add_argument("--message", help="直接传入待校验的 commit message")
    args = parser.parse_args()

    message = load_message(args)
    if not message:
        print("[FAIL] commit message 为空")
        return 1

    if message.startswith(IGNORED_PREFIXES):
        print(f"[PASS] 跳过特殊提交信息: {message}")
        return 0

    if not CHINESE_RE.search(message):
        print(f"[FAIL] commit message 必须包含中文: {message}")
        print("示例: 修复: 稳定 Android Release 启动")
        return 1

    print(f"[PASS] commit message 包含中文: {message}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
