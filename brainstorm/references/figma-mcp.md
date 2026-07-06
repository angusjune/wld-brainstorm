# Figma MCP Usage

Use this reference whenever a skill says "Figma MCP". Different agents expose Figma through different built-in or MCP tool names, and some agents need tool discovery before the tools are visible.

## Setup

If Figma tools are not available in the current agent, set up a Figma MCP server before running any Figma-dependent WLD skill. Figma currently offers two server options:

- **Remote Figma MCP server (default preferred):** hosted by Figma at `https://mcp.figma.com/mcp`. Use this when the MCP client supports remote HTTP servers and OAuth-style sign-in. It has the broadest feature set, including write-to-canvas features.
- **Desktop Figma MCP server:** runs locally through the Figma desktop app, usually at `http://127.0.0.1:3845/mcp`. Use this when remote MCP is unavailable and only reading is required (desktop Figma MCP has no write tools).

### Remote Server Setup

1. Confirm the user has access to the target Figma file and can sign in to Figma from the MCP client.
2. In the MCP client, add an HTTP MCP server with this endpoint:

   ```json
   {
     "servers": {
       "figma": {
         "type": "http",
         "url": "https://mcp.figma.com/mcp"
       }
     }
   }
   ```

3. Start or reconnect the server from the MCP client.
4. Complete the Figma authentication flow when prompted.
5. Verify that Figma tools appear before continuing. Look for `get_design_context`, `get_metadata`, `get_screenshot`, or write/edit tools.

### Desktop Server Setup

1. Install and open the Figma desktop app.
2. Open a Figma Design file.
3. Switch to Dev Mode.
4. Enable the MCP server from the Dev Mode / inspect panel. Figma should show a confirmation that the local server is running.
5. Copy the server URL shown by Figma. Prefer the copied URL; common current values are `http://127.0.0.1:3845/mcp` or, in older SSE-based clients, `http://127.0.0.1:3845/sse`.
6. Add that URL to the MCP client using the matching transport:

   ```json
   {
     "servers": {
       "figma-desktop": {
         "type": "http",
         "url": "http://127.0.0.1:3845/mcp"
       }
     }
   }
   ```

7. Keep the Figma desktop app open while using the desktop server.
8. Verify the tools appear before continuing. If the client cannot connect, confirm the desktop app is running, Dev Mode MCP is enabled, and the URL/transport match the client.

### Client Notes

- If the client has a built-in Figma plugin or marketplace entry, use that first; it usually handles server config and authentication.
- If the client has tool discovery, search for `figma` after setup and reconnect/restart the client if tools are not visible.
- For remote setup in generic MCP clients, use HTTP transport and `https://mcp.figma.com/mcp`.
- For desktop setup, use the exact local URL Figma displays. Do not assume `/sse` or `/mcp` without checking what the client and Figma desktop app expect.
- If setup is impossible in the current environment, follow the calling skill's fallback path and label the output as screenshot-only, name-only, or spec-only as appropriate.

## What Counts as Figma MCP

Any available tool or app namespace that can read or edit Figma files counts. Look for tool names, app names, or MCP servers containing `figma`.

Common capability names:

- `get_design_context` - read a node's layout, visible text, styles, tokens, and component context. This is the primary read tool.
- `get_metadata` - enumerate pages, frames, child nodes, names, and node ids.
- `get_screenshot` - capture a node as an image. Use for visual-only cues or visual comparison references.
- `use_figma`, `generate_figma_design`, or an edit/write tool - apply edits to a Figma file when the skill explicitly allows write-back.

If no Figma tool is visible but tool discovery is available, search for `figma` first. If discovery still finds no Figma tool, follow the calling skill's no-MCP fallback instead of pretending the file was read.

## Parse Figma URLs

Extract `fileKey` and `nodeId` before calling tools:

- `figma.com/design/{fileKey}/{fileName}?node-id={nodeId}`
- `figma.com/file/{fileKey}/{fileName}?node-id={nodeId}`
- `figma.com/design/{fileKey}/branch/{branchKey}/{fileName}` - use `branchKey` as the file key when the MCP expects branch files.
- Convert URL node ids from dash form to colon form: `22415-48845` -> `22415:48845`.
- If the URL has no `node-id`, start with file/page metadata, then choose the relevant frame by name.

## Read Workflow

1. Call metadata on the file or supplied node to identify the target frames and node ids.
2. Call design context on each relevant frame. Prefer structured text/layout data over screenshots for analysis.
3. Use screenshots only when structure is insufficient, such as disabled CTA color, selected chip state, or pixel comparison references.
4. For large files, avoid dumping the whole tree into the model. Save metadata to a temp file if the tool supports it, then filter to frames by `name`, `id`, and `type`.
5. Record node ids for any visible text that may need correction later.

## Write Workflow

Only write to Figma when the calling skill says write-back is allowed and the user explicitly confirms it.

- Prefer editing visible text nodes only unless the skill explicitly permits layout or node changes.
- Use the exact node ids captured during the read workflow.
- Keep a before/after list of changed nodes.
- If the available Figma MCP is read-only, provide a copy-paste change list instead of claiming the file was updated.

## Fallbacks

- If Figma MCP is unavailable, use the fallback named by the skill: exported screenshots, attached images, or designer-pasted frame names.
- For diff or coverage tasks, never treat "no frames read" as evidence that every state is missing.
- State the source mode in the output, e.g. `Figma MCP`, `screenshot only`, or `name-only from designer`.
