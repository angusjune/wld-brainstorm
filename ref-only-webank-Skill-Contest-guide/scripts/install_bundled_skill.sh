#!/usr/bin/env bash
# 把本技能 assets 里打包的 skill 副本安装到用户的 skills 目录。
# 用法: install_bundled_skill.sh skill-creator
# 注意: assets/skill-market 是 Mobot 专用参考副本(仅供检测比对)，本脚本会拒绝安装它。
set -euo pipefail

NAME="${1:?用法: install_bundled_skill.sh skill-creator}"
if [ "${NAME}" = "skill-market" ]; then
  echo "错误：assets/skill-market 是 Mobot 专用参考副本，仅用于检测比对，不要安装给任何用户。"
  echo "非 Mobot 用户请走官方指引页安装市场 CLI: http://api.wfaas.weoa.com/fc-a399-skill-market-guide/"
  exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="${SCRIPT_DIR}/../assets/${NAME}"
test -d "${SRC}" || { echo "错误：assets 里没有 ${NAME}"; exit 1; }

# 定位 skills 目录：
# Mobot 等 SDK 托管环境从 CLAUDE_USER_WORKSPACE 反推项目根（形如 C:\MobotAgentService\data\workspace\<bot>\<user>\），
# 否则用本机 ~/.claude/skills/
SKILLS_DIR=""
if [ -n "${CLAUDE_USER_WORKSPACE:-}" ]; then
  WS=$(printf '%s' "$CLAUDE_USER_WORKSPACE" | tr '\\' '/')
  case "$WS" in
    */data/workspace/*) SKILLS_DIR="${WS%%/data/workspace/*}/.claude/skills" ;;
  esac
fi
[ -n "$SKILLS_DIR" ] || SKILLS_DIR="$HOME/.claude/skills"

DEST="${SKILLS_DIR}/${NAME}"
if [ -d "${DEST}" ]; then
  # 注意：中文全角标点不能紧跟 $VAR（bash 会把多字节字符并进变量名），统一用 ${VAR}
  echo "已存在：${DEST}（无需重复安装）"
  exit 0
fi
mkdir -p "${SKILLS_DIR}"
cp -r "${SRC}" "${DEST}"
echo "已安装到 ${DEST}"
