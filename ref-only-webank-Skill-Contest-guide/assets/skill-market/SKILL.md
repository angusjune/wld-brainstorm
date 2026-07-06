---
name: skill-market
description: Skill 市场直连版工具，无需安装 pm-cli。直接调用后端 HTTP API 完成搜索、浏览市场列表、下载、安装、列出、移除、发布、删除 skill。当用户提到"搜索 skill"、"安装 skill"、"查找插件"、"找一个 skill"、"market 上有什么"、"装一下 xxx"、"我装了哪些 skill"、"卸载/移除 skill"、"市场列表"、"最热 skill"、"最新 skill"、"浏览市场" 时触发。也适用于用户想分享 skill、按作者名搜索、按 funcName 搜索的场景。
---

# Skill 市场直连版

这是 **pm-cli 的零依赖替代品**。所有操作直接通过 HTTP API 完成，**用户不需要安装 pm-cli**，也不需要 npm/node 之外的任何工具。

> 你（Claude）的工具就是 pm-cli。当用户要求做 skill 市场操作时，按下面的步骤用你已有的 Bash / Read / Write / Edit 工具完成。

## 关键参数

```
SERVER_URL    = https://uat.prophecis.bdap.weoa.com
PROJECT_ROOT  = (从 $CLAUDE_USER_WORKSPACE 反推，见下一节)
SKILLS_DIR    = $PROJECT_ROOT/.claude/skills
```

> 项目根 = `$CLAUDE_USER_WORKSPACE` 切掉 `/data/workspace/<user>/...` 尾部。
> 写到 `$SKILLS_DIR/<NAME>/` 就是项目根的 `.claude/skills/<NAME>/`，SDK 自动发现，不需要 reload。
> **绝对不要**用 `./.claude/skills/`——PWD 大概率是用户工作目录，相对路径会装错地方。

如果用户配置了 `SKILL_MARKET_SERVER` 环境变量，优先用它。

## 定位项目根 .claude/skills/（重要 ⭐）

**绝对不要**用相对路径 `./.claude/skills/`。当前会话 PWD 大概率是用户工作目录
（`<project_root>/data/workspace/<user_id>/...`），相对路径会把 skill 装到 workspace 子目录里，SDK 不会发现。

**正确做法**：从 `$CLAUDE_USER_WORKSPACE` 环境变量反推项目根，每次安装/卸载/列举前先算出绝对路径：

```bash
PROJECT_ROOT=$(python3 -c "
import os, sys
ws = os.environ.get('CLAUDE_USER_WORKSPACE', '').replace(chr(92), '/').rstrip('/')
if not ws or '/data/workspace/' not in ws:
    sys.exit(1)
print(ws.split('/data/workspace/')[0])
")
test -n "$PROJECT_ROOT" || { echo "无法定位项目根：CLAUDE_USER_WORKSPACE 未设置或格式异常"; exit 1; }
SKILLS_DIR="$PROJECT_ROOT/.claude/skills"
mkdir -p "$SKILLS_DIR"
```

> `$CLAUDE_USER_WORKSPACE` 形如 `C:\MobotAgentService\data\workspace\wecom_bot_X\USER\`，
> 反斜杠先转成正斜杠，再按 `/data/workspace/` 切分，左半就是项目根
> （例如 `C:/MobotAgentService` → 正斜杠在 Windows bash / cp / mkdir 都可用）。
> 之后 `$SKILLS_DIR/<NAME>/` 就是项目级 skill 的真实位置（即文件管理器里看到的
> `C:\MobotAgentService\.claude\skills\<NAME>\`）。

> ⚠ **每个 bash 调用是独立进程**，`$PROJECT_ROOT` / `$SKILLS_DIR` 不会跨调用保留。
> 所以每个需要写/读 skill 的 bash 块都要**重新算一次**这两个变量。

## curl 通用参数（重要）

所有 curl 请求**必须**加以下参数，否则大概率失败：

```bash
curl -sk --noproxy "*" ...
```

| 参数 | 原因 |
|---|---|
| `-s` | 静默模式，不输出进度条 |
| `-k` | 跳过 TLS 证书验证（内网自签证书） |
| `--noproxy "*"` | 不走代理直连（走代理会被 reset） |

后面所有操作的 curl 命令**都已包含这些参数**，不要省略。

---

## 操作 1: 搜索 skill

**触发**: 用户说"搜 xxx"、"找个能 yyy 的 skill"、"市场上有什么 zzz"。

**步骤**:

1. 把用户的查询词存到变量 `Q`（保留中文，URL 编码）
2. 用 Bash 调搜索 API：

   ```bash
   curl -sk --noproxy "*" -G "$SERVER_URL/cc/v2/plugin-guest/search" \
     --data-urlencode "q=$Q" \
     --data-urlencode "topK=10"
   ```

3. 响应是 JSON，结构：
   ```json
   {
     "results": [
       { "name": "...", "funcName": "...", "pluginId": "...",
         "description": "...", "score": 0.65, "matchType": "fuzzy",
         "pluginType": 600, "installCount": 42,
         "createUser": "owenwang", "createDepartment": "基础科技产品部" }
     ]
   }
   ```

4. 用 markdown 表格给用户呈现结果，格式：

   | # | 名字 | 描述（截断 60 字） | 作者 | 部门 | 安装量 | 安装命令 |
   |---|---|---|---|---|---|---|
   | 1 | name | desc | createUser | createDepartment | 42 | 装 funcName |

5. **重要**：搜索能按 **作者名**（例如 `owenwang`）、**funcName**（例如 `mysql-mcp-main`）和 **部门名**（例如 `武汉研发中心`）匹配，因为后端搜索索引把这些字段都建了进去。如果用户问"我发了哪些 skill"，直接搜他的用户名；如果问"武汉研发的 skill"，直接搜部门名。

---

## 操作 2: 下载 skill zip

**触发**: 用户说"下载 xxx"、"拿 xxx 的 zip"、"我要看 xxx 的源码"。

**步骤**:

1. 用 nameDown 接口（按 funcName 下载）：

   ```bash
   curl -skL --noproxy "*" "$SERVER_URL/cc/v2/plugin-guest/nameDown?pluginName=$NAME" -o /tmp/$NAME.zip
   ```

2. 或者按 pluginId 下载：

   ```bash
   curl -skL --noproxy "*" "$SERVER_URL/cc/v2/plugin-guest/plugin/$PLUGIN_ID/pluginDownload" -o /tmp/$NAME.zip
   ```

3. 告诉用户 zip 在哪、多大、含哪些文件（用 `unzip -l` 或 Bash + `file` 查看）

---

## 操作 3: 安装 skill（核心操作 ⭐）

**触发**: 用户说"装 xxx"、"install xxx"、"把 xxx 装上"。

skill 落地到**项目根**绝对路径 `$PROJECT_ROOT/.claude/skills/<SKILL_NAME>/`，SDK 自动发现。
`$PROJECT_ROOT` 必须从 `$CLAUDE_USER_WORKSPACE` 反推（见「定位项目根」一节），**不要**用 `./.claude/skills/`。
**不要**碰 `~/.claude/plugins/` 任何文件，**不要**改 settings.json，**不要**让用户 reload 或重启。

### Step 1: 下载 zip

```bash
NAME="<funcName>"   # 用户给的名字
TMPZIP="/tmp/skill-market-install-$$.zip"
TMPDIR="/tmp/skill-market-extract-$$"
curl -skL --noproxy "*" --fail "$SERVER_URL/cc/v2/plugin-guest/nameDown?pluginName=$NAME" -o "$TMPZIP"
test -s "$TMPZIP" || { echo "下载失败"; exit 1; }
mkdir -p "$TMPDIR"
unzip -q "$TMPZIP" -d "$TMPDIR"
```

### Step 2: 定位 SKILL.md，确定 skill 内容根目录

zip 布局可能有三种，按优先级：

1. `$TMPDIR/SKILL.md`            → 内容根 = `$TMPDIR`
2. `$TMPDIR/skills/<X>/SKILL.md` → 内容根 = `$TMPDIR/skills/<X>`（取第一个）
3. `$TMPDIR/<X>/SKILL.md`        → 内容根 = `$TMPDIR/<X>`

找不到 SKILL.md 就停止安装并报错。

```bash
if [ -f "$TMPDIR/SKILL.md" ]; then
  SKILL_ROOT="$TMPDIR"
else
  SKILL_ROOT=$(find "$TMPDIR" -maxdepth 3 -name SKILL.md -print -quit | xargs -I{} dirname {})
fi
test -n "$SKILL_ROOT" -a -f "$SKILL_ROOT/SKILL.md" || { echo "zip 里没找到 SKILL.md，放弃"; exit 1; }
```

### Step 3: 解析 SKILL.md frontmatter，拿真 name

```bash
SKILL_NAME=$(awk '/^---$/{f=!f;next} f && /^name:/{sub(/^name:[[:space:]]*/,""); print; exit}' "$SKILL_ROOT/SKILL.md")
[ -z "$SKILL_NAME" ] && SKILL_NAME="$NAME"
```

### Step 4: 落地到项目根 `.claude/skills/`（绝对路径）

**必须**先按「定位项目根」一节算出 `$SKILLS_DIR`，再写入。**不要**用 `./.claude/skills/`。

```bash
# 定位项目根（每个 bash 调用独立进程，必须重新算）
PROJECT_ROOT=$(python3 -c "
import os, sys
ws = os.environ.get('CLAUDE_USER_WORKSPACE', '').replace(chr(92), '/').rstrip('/')
if not ws or '/data/workspace/' not in ws:
    sys.exit(1)
print(ws.split('/data/workspace/')[0])
")
test -n "$PROJECT_ROOT" || { echo "无法定位项目根：CLAUDE_USER_WORKSPACE 异常"; exit 1; }
SKILLS_DIR="$PROJECT_ROOT/.claude/skills"

DEST="$SKILLS_DIR/$SKILL_NAME"
rm -rf "$DEST"
mkdir -p "$SKILLS_DIR"
cp -r "$SKILL_ROOT" "$DEST"
# 移除 plugin 元数据（项目级 skill 不需要 .claude-plugin/plugin.json）
rm -rf "$DEST/.claude-plugin"
echo "已安装到 $DEST"
```

> 落点必须是 `<DRIVE>:/MobotAgentService/.claude/skills/<NAME>/` 形式，
> **绝对不应**包含 `data/workspace/` 子串。如果包含，说明定位项目根的 python 一段没生效，停下来排查。

### Step 5: 清理临时文件 + 提示用户

```bash
rm -rf "$TMPZIP" "$TMPDIR"
```

告诉用户（**用 Step 4 输出里 `已安装到 ...` 的真实绝对路径**回填 `$DEST`）：

> ✅ 已安装到 `$DEST`（项目根 `.claude/skills/<SKILL_NAME>/`），下一轮对话即可使用。

核对路径：路径里**不应**出现 `data\workspace`，**应**直接以 `MobotAgentService\.claude\skills\` 结尾。

**严禁**说 "执行 /reload-plugins"、"重启 Claude Code"、"重新加载" 之类的话——
本项目 SDK 自动发现 skills，没有任何手动 reload 步骤。

---

## 操作 4: 浏览市场列表

**触发**: 用户说"市场上有什么"、"看看市场"、"列一下市场的 skill"、"最新的 skill"、"最热的 skill"。

**步骤**:

1. 用 Bash 调分页列表 API：

   ```bash
   curl -sk --noproxy "*" -G "$SERVER_URL/cc/v2/plugin-guest/list" \
     --data-urlencode "pageIndex=1" \
     --data-urlencode "pageSize=12" \
     --data-urlencode "type=500" \
     --data-urlencode "sortBy=collection"
   ```

2. 可选参数：

   | 参数 | 说明 | 可选值 |
   |---|---|---|
   | `type` | 类型筛选 | 500=Plugin+Skill 合并查询 |
   | `toolType` | 子分类 | 900=其他, 1800=代码设计, 1900=办公, 2000=数据分析, 2100=工具 |
   | `keyword` | 关键词（匹配名称/描述/funcName/部门） | 任意字符串 |
   | `sortBy` | 排序 | `collection`(收藏) / `install`(安装量) / `time`(最新) |
   | `pageIndex` | 页码 | 从 1 开始 |
   | `pageSize` | 每页条数 | 最大 100 |

3. 响应结构：
   ```json
   {
     "catalog": [
       { "id": "...", "name": "...", "funcName": "...", "type": 500,
         "toolType": 1800, "description": "...", "createUser": "...",
         "createDepartment": "...", "installCount": 42,
         "collectionCount": 10, "visibility": 0, "updatedAt": "..." }
     ],
     "count": 100
   }
   ```

4. 用 markdown 表格呈现，格式：

   | # | 名字 | 描述（截断 60 字） | 作者 | 安装量 | 安装命令 |
   |---|---|---|---|---|---|
   | 1 | name | desc | createUser | 42 | 装 funcName |

5. 如果 `count` > `pageSize`，提示用户"还有更多，说'下一页'继续"，下一页把 `pageIndex` 加 1 即可。

6. 如果有 PAT，可加鉴权头（能看到自己有权限的私有 skill）：
   ```bash
   -H "Authorization: Bearer $SKILL_MARKET_PAT"
   ```

---

## 操作 5: 列出已安装的 skill

**触发**: 用户问"我装了哪些 skill"、"list"、"看看本地"。

**步骤**:

1. 先按「定位项目根」一节算出 `$SKILLS_DIR`：

   ```bash
   PROJECT_ROOT=$(python3 -c "
   import os, sys
   ws = os.environ.get('CLAUDE_USER_WORKSPACE', '').replace(chr(92), '/').rstrip('/')
   if not ws or '/data/workspace/' not in ws:
       sys.exit(1)
   print(ws.split('/data/workspace/')[0])
   ")
   SKILLS_DIR="$PROJECT_ROOT/.claude/skills"
   ls -1 "$SKILLS_DIR"
   ```

2. 每个子目录就是一个已安装的 skill；可以读其 `SKILL.md` 的 frontmatter 拿 description
3. 用 markdown 表格呈现：

   | name | description（截断 60 字） |
   |---|---|

---

## 操作 6: 移除/禁用 skill

**触发**: 用户说"卸载 xxx"、"移除 xxx"、"disable xxx"。

**步骤**:

1. 先按「定位项目根」一节算出 `$SKILLS_DIR`，再用绝对路径删除：

   ```bash
   PROJECT_ROOT=$(python3 -c "
   import os, sys
   ws = os.environ.get('CLAUDE_USER_WORKSPACE', '').replace(chr(92), '/').rstrip('/')
   if not ws or '/data/workspace/' not in ws:
       sys.exit(1)
   print(ws.split('/data/workspace/')[0])
   ")
   SKILLS_DIR="$PROJECT_ROOT/.claude/skills"
   TARGET="$SKILLS_DIR/<NAME>"

   test -d "$TARGET" || { echo "未找到 $TARGET"; exit 1; }
   rm -rf "$TARGET"
   test ! -e "$TARGET" && echo "已删除 $TARGET" || { echo "删除失败"; exit 1; }
   ```

2. 告诉用户「已移除 `$TARGET`（项目根 `.claude/skills/<NAME>/`），下一轮对话不再加载」。

**严禁**提 reload-plugins、重启 Claude Code 之类——SDK 自动发现，不需要手动操作。
**严禁**用相对路径 `./.claude/skills/<NAME>`，会指到 workspace 子目录，删错地方。

---

## 操作 7: 发布 skill（需要鉴权）

**触发**: 用户说"发布 xxx"、"上传 xxx 到市场"、"publish"。

### 前置：拿到 PAT

用户必须有一个 PAT（格式 `pmcli_xxxxxxxx`）。**没有的话先让用户去拿一个**：

1. 浏览器打开 UAT 插件广场（SSO 登录后）：
   ```
   https://uat.prophecis.bdap.weoa.com/#/assets/plugin
   ```
2. 在页面顶部搜索框右边找到 **「令牌管理」** 按钮（仅 UAT 环境可见，OA/SF 没有这个按钮）
3. 在弹出对话框里点「新建令牌」，复制返回的 `pmcli_xxxxxxxx`。**只显示一次**，复制不到就只能再生成
4. 把它存到环境变量（建议加到 `~/.bashrc` / `~/.zshrc` / Windows 用户环境变量）：
   ```bash
   export SKILL_MARKET_PAT='pmcli_xxxxxxxx'
   ```
5. 或者临时用：直接告诉 Claude "我的 PAT 是 pmcli_xxx"

> ⚠ **不要**让用户去 `https://uat.prophecis.bdap.weoa.com/#/cli-auth` 这个页面 —— 那个是 pm-cli 浏览器登录流程专用的，**强制要求 `?port=` 参数**，单独打开会报"参数错误，缺少 port 参数"。

> ⚠ **不要把 PAT 写进任何提交到 git 的文件**，也不要在共享屏幕时露出。它等同于密码。

**先验证 PAT 是否有效**（每次发布前可以跑一下确认）：

```bash
curl -sk --noproxy "*" -H "Authorization: Bearer $SKILL_MARKET_PAT" \
  "$SERVER_URL/cc/v2/plugin-guest/pat/verify"
# 期望返回 {"userName":"xxx",...}，如果是 401 说明 token 失效要重新拿
```

### Step 1: 把目录打成 zip

让 Claude 用 Bash 把要发布的目录打包。**重要**：如果是纯 skill 目录（根有 SKILL.md，没 plugin.json），先不要补 plugin.json，原样打 —— 后端的 `validatePluginClaude` 会接受这种格式（无 plugin.json 则用 zip 文件名作为 funcName fallback）。

```bash
SRC_DIR="<用户给的目录路径>"
SKILL_NAME="<最终插件名>"   # 决定上传后的 funcName fallback
ZIP_PATH="/tmp/$SKILL_NAME.zip"

# 用 zip 命令打包，排除常见垃圾
cd "$SRC_DIR"
zip -r "$ZIP_PATH" . \
  -x "*.git/*" "node_modules/*" ".DS_Store" "__pycache__/*" "*.env" \
  > /dev/null
test -s "$ZIP_PATH" || { echo "打包失败"; exit 1; }
ls -lh "$ZIP_PATH"
```

如果系统没有 `zip` 命令（Windows 默认没），用 python：
```bash
python3 -c "
import shutil, os
shutil.make_archive('/tmp/$SKILL_NAME', 'zip', '$SRC_DIR')
print(os.path.getsize('/tmp/${SKILL_NAME}.zip'), 'bytes')
"
ZIP_PATH="/tmp/${SKILL_NAME}.zip"
```

### Step 2: 上传文件，拿 fileId

```bash
RESP=$(curl -sk --noproxy "*" -H "Authorization: Bearer $SKILL_MARKET_PAT" \
  -F "file=@$ZIP_PATH;filename=${SKILL_NAME}.zip" \
  -F "fileName=${SKILL_NAME}.zip" \
  "$SERVER_URL/cc/v2/plugin-guest/uploadfile")
echo "$RESP"

# 解析 fileId（用 python 兜底）
FILE_ID=$(echo "$RESP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
r=d.get('result',{})
print(r.get('file_id') or r.get('fileId') or '')
")
test -n "$FILE_ID" || { echo "上传失败：$RESP"; exit 1; }
echo "fileId=$FILE_ID"
```

### Step 3a: 创建新插件

```bash
DESC="<描述，最多 250 字符，超过截断>"
curl -sk --noproxy "*" -H "Authorization: Bearer $SKILL_MARKET_PAT" \
  -H "Content-Type: application/json" \
  -X POST "$SERVER_URL/cc/v2/plugin-guest/plugin" \
  -d "$(python3 -c "
import json
print(json.dumps({
  'name': '$SKILL_NAME',
  'pluginType': 500,
  'type': 500,
  'tool_type': 1100,
  'uploadType': 'upload',
  'fileUri': '$FILE_ID',
  'description': '''$DESC'''[:250],
  'serverType': 100,
  'isPersonal': True,
}, ensure_ascii=False))
")"
```

成功后响应里有 `result.id`（pluginId）和 `result.funcName`，把它们告诉用户。

### Step 3b: 更新已有插件（如果用户给了 pluginId）

```bash
PLUGIN_ID="<用户给的 pluginId>"
curl -sk --noproxy "*" -H "Authorization: Bearer $SKILL_MARKET_PAT" \
  -H "Content-Type: application/json" \
  -X PUT "$SERVER_URL/cc/v2/plugin-guest/plugin/$PLUGIN_ID" \
  -d "$(python3 -c "
import json
print(json.dumps({
  'name': '$SKILL_NAME',
  'description': '''$DESC'''[:250],
  'toolType': 1100,
  'fileUri': '$FILE_ID',
  'uploadType': 'upload',
}, ensure_ascii=False))
")"
```

### Step 4: 清理 + 提示用户

```bash
rm -f "$ZIP_PATH"
```

告诉用户：

> ✅ 插件已发布！
> - pluginId: `<id>`
> - funcName: `<funcName>`
> - 别人安装命令：`pm-cli install <funcName>` 或者直接对 Claude 说"装一下 <funcName>"
> - 5 分钟后会被搜索引擎自动 reindex，到时就能搜到了

### 不能做发布的情况

- **PAT 无效或缺失** → 告诉用户去拿 PAT
- **文件大于 100MB** → 后端会拒收
- **funcName 已被别人占用** → 改名重发，或者带 `--update <id>` 模式更新自己已有的
- **同步到 SF 生产环境** → 本 skill 不直接做，让用户走 ITSM 工单

---

## 注意事项

1. **JSON 解析**：响应都是 JSON，可以用 Bash 通过 `python3 -c "import json,sys; ..."` 或者直接用 Read/Grep 分析；不要假定 `jq` 可用
2. **路径**：用**绝对路径** `$PROJECT_ROOT/.claude/skills/`（从 `$CLAUDE_USER_WORKSPACE` 反推，见「定位项目根」一节）；**禁止**用相对路径 `./.claude/skills/` —— 当前 PWD 是用户工作目录，相对路径会装到 `data/workspace/<bot>/<user>/.claude/skills/` 里去，SDK 不会发现。**不要**碰 `~/.claude/plugins/`、`~/.claude/settings.json`
3. **Windows 兼容**：用户在 Windows + bash (Git Bash / WSL) 下也要能用，避免 `/dev/null` 之外的特殊设备路径
4. **错误反馈**：每一步失败要明确告诉用户哪一步、为什么。不要静默失败
5. **代理/网络**：内网环境下 curl **必须加 `-k --noproxy "*"`**（跳过证书验证 + 不走代理）。走代理反而会被 reset。如果仍然失败，让用户确认网络是否能通 `uat.prophecis.bdap.weoa.com`
6. **不要让用户 reload 或重启**：本项目 SDK 自动发现 `.claude/skills/`，安装/卸载完成后下一轮对话即生效，**禁止**输出 `/reload-plugins`、"重启 Claude Code"、"重新加载插件" 等指引

---

## 跟其他 pm-cli 变体的关系

| 变体 | 依赖 | 安装方式 | 谁用 |
|---|---|---|---|
| `pm-cli-claudecode` | 需要 npm 装 `@webank/cc-plugin-manager` | slash commands `/pm-cli-claudecode:xxx` | 喜欢精确命令的人 |
| `pm-cli-openclaw` | 需要 pm-cli + OpenClaw 平台 | OpenClaw 内导入 | OpenClaw 用户 |
| **`skill-market`（本 skill）** | **无任何依赖**，零安装 | Claude Code 自动触发 | 所有人，最佳默认 |

如果用户既装了 `pm-cli-claudecode` 又装了本 skill，按用户偏好选择 —— slash commands 适合精确操作，本 skill 适合自然语言。
