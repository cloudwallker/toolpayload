# Research and measurement notes (2026-09-21)

ToolPayload focuses on **offline, saved, completed `tools/call` result objects**. Its main output is field-level attribution of normalized JSON bytes plus a versioned baseline comparison for CI. It is not a general MCP protocol tester and does not claim to be the first tool that checks response size.

## Relevant prior work and specifications

- The [MCP tools specification](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) defines the result shape, including content, structured content, and tool errors. It does not establish ToolPayload's 65,536-byte or 20% budgets; those are local starter defaults.
- The [MCP community discussion on tool response size](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/2211) provides context for why large results matter. Community discussion is not a protocol limit.
- [Cloudflare's MCP repository](https://github.com/cloudflare/mcp) is adjacent MCP infrastructure. ToolPayload's saved-result field attribution and baseline format are scoped to a different offline workflow.
- [Glean's MCP Server Tester](https://github.com/gleanwork/mcp-server-tester) illustrates existing MCP testing work, including response-related checks. This project does not claim a novel category of size testing.
- [`js-tiktoken`](https://github.com/dqbd/tiktoken/tree/main/js) supplies the `cl100k_base` tokenizer used for the two token estimates. Its counts do not establish a production model's bill.

These references guided scope and vocabulary, not a claim that other tools lack every feature listed here. The published URLs were reviewed for this project on the date above; later versions may differ.

## Metric contract and limits

`resultBytes` measures the UTF-8 length of a compact JSON rendering after recursively sorting object keys using JavaScript's UTF-16 lexical order. It includes `_meta` and uses JavaScript's ordinary JSON number semantics. It excludes the JSON-RPC envelope, transport framing, compression, and any client-side transformation; calling it wire size would be inaccurate. Array order remains significant. Field attribution includes subtree sizes, so parent and descendant byte counts overlap.

Text content blocks and embedded text resources are tokenized separately with `cl100k_base`, then their counts are added as `textTokens`. When `structuredContent` exists, its normalized JSON is tokenized separately as `structuredTokens`. Binary payload bytes count toward `resultBytes` but are not text tokens. Neither token number is a provider billing estimate. The tool does not perform a second parse of JSON-looking strings.

Only saved samples are analyzed. A sample can miss production outliers, pagination, content negotiation, or real client behavior. The CLI accepts files up to 10 MiB and nesting up to 100 levels. Baselines and reports retain paths and field names, case IDs, metric counts, finding and warning codes, but not original response values. **Those retained names and paths may still disclose information**; inspect artifacts before distributing them.

The default budgets are deliberately modest starting values for user adjustment, not MCP or vendor limits. `check` fails on values strictly greater than the configured absolute or growth thresholds, `isError: true`, and added or missing cases. From a zero-byte baseline, zero remains 0% growth and a positive value fails growth with an undefined percentage. Invalid inputs and incompatible baselines have a separate exit code, so CI can distinguish measurement failure from a size regression.
