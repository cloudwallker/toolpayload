# ToolPayload

### 离线检查 MCP 工具结果的体积预算

**找出已保存 MCP 结果中占用过大的字段，与基线比较，在 CI 中发现体积回归，并通过单文件 HTML 报告查看详情。**

[English](README.md) | 简体中文

[安装与演示](#从源码安装) · [结果与预算](#结果文件与预算) · [指标边界](#指标边界)

ToolPayload 是面向 [Model Context Protocol（MCP）工具](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)维护者的离线命令行工具：分析已保存的工具结果，找出主要占用字段，并在 CI 中执行可配置的响应大小预算。

- 计量规范化 JSON 字节数，定位体积最大的字段。
- 将样本与已保存基线比较，超预算时让 CI 检查失败。
- 通过单文件 HTML 报告筛选样本、排序大小和展开字段。

完全离线分析已保存的 JSON，并按项目需要配置体积预算。字节与 token 的测量定义见[指标边界](#指标边界)。

![ToolPayload HTML 报告预览](docs/assets/report-preview.png)

![toolpayload](docs/assets/cartoon-infographic.png)

## 从源码安装

需要 Node.js 22 或更新版本、npm 和 Git。首次安装依赖需要联网或已有 npm 缓存。

```sh
git clone https://github.com/cloudwallker/toolpayload.git
cd toolpayload
npm ci
npm run build
npm run demo
```

也可下载仓库 ZIP，解压后在目录中运行上述 npm 命令。

示例生成 `artifacts/baseline.json`、`artifacts/demo-report.json` 和可直接在浏览器打开的 `artifacts/demo-report.html`。`search` 案例的当前结果加入了冗长的检索日志，会按预期超过 20% 增长预算；`multimodal` 案例保持不变。演示脚本将这次预期内的检查失败视为演示成功。

也可直接调用编译后的 CLI：

```sh
node dist/cli.js analyze examples/baseline-search.json --format text
node dist/cli.js snapshot --config examples/baseline-config.json --out artifacts/my-baseline.json
node dist/cli.js check --config examples/current-config.json --baseline artifacts/my-baseline.json --format html --out artifacts/my-report.html
```

最后一条命令会因故意膨胀的样本返回退出码 1。`analyze FILE` 与 `check` 都支持 `--format text|json|html` 和 `--out FILE`。`snapshot` 默认不覆盖已有基线，需覆盖时加 `--force`。`check` 不改写基线；即使检查失败，也会写出指定报告。

## 安装本地 npm 压缩包

完成源码依赖安装后，在仓库根目录生成安装包：

```sh
npm pack
```

在另一个 npm 项目中安装生成的文件并运行 CLI，将示例路径替换为压缩包的实际位置：

```sh
npm install /path/to/toolpayload-0.1.0.tgz
npx --no-install toolpayload --help
npx --no-install toolpayload analyze response.json --format html --out report.html
```

这是项目内的本地安装，请使用 `npx --no-install` 或 npm 脚本运行；命令不会加入终端的全局 `PATH`。安装压缩包无需先将本项目发布到 npm，但首次安装依赖可能需要联网或已有 npm 缓存。安装完成后，分析和 HTML 报告完全离线运行。

## 结果文件与预算

可保存已完成 `tools/call` 的**结果对象**，也可保存带外层 JSON-RPC 信封的响应（`{"jsonrpc":"2.0","id":1,"result":{...}}`）。两种输入都只计量内部结果。结果须有 `content` 数组和/或自身的 `structuredContent` 属性；后者可以是 `null`。若有 `resultType`，其值必须为 `complete`。JSON-RPC `error` 响应不能作为结果输入。可查看[精简结果](examples/baseline-search.json)、[冗长结果](examples/current-search.json)和[文字/图片混合结果](examples/multimodal-result.json)。

配置的 `schemaVersion` 为 1，案例 ID 不得重复。每个 `file` 都相对于配置文件解析，因此从任意工作目录运行示例都能找到样本。顶层 `budget` 可提供默认值；案例中的 `budget` 可覆盖该案例的对应值。默认起步预算是 65,536 个规范化结果字节和 20% 增长。

```json
{
  "schemaVersion": 1,
  "budget": { "maxResultBytes": 65536, "maxGrowthPercent": 20 },
  "cases": [
    { "id": "search", "file": "current-search.json" },
    { "id": "multimodal", "file": "multimodal-result.json" }
  ]
}
```

先对经过确认的代表性结果运行 `snapshot`，再将基线和样本纳入版本管理；在 CI 中用当前样本运行 `check`。只有**严格超过**绝对字节或增长百分比阈值才会失败。工具返回 `isError: true`、案例新增或缺失也会失败。基线与当前值同为 0 时增长率为 0%；从 0 增长到正数会触发增长预算失败，此时没有可显示的有限百分比。

退出码：`0` 表示成功或检查无失败项，`1` 表示检查有失败项，`2` 表示输入、配置无效或基线不兼容。基线和报告带有 `schemaVersion: 1`、`metricVersion: 1`、`tokenizer: "cl100k_base"`，避免误将不同测量规则的结果作比较。

## 指标边界

`resultBytes` 是结果对象经过**紧凑 JSON 序列化**后的 UTF-8 字节数。对象键递归按 JavaScript 的 UTF-16 字典序排序，数组顺序保留，数值遵循 JavaScript JSON 序列化语义，并计入 `_meta`。输入文件的空白和对象键顺序不会影响这一指标。它**不是传输字节数**：不包含 JSON-RPC 信封和传输层封装。字段树中父节点与子节点的大小互相重叠，不可相加。

`textTokens` 使用 `cl100k_base` 分别计算每个文字内容块和嵌入的文字资源，再将这些块的计数相加。若有 `structuredContent`，`structuredTokens` 单独计算其紧凑、排序后的 JSON。这是两个不同视角，不能直接相加当作模型账单。图片等二进制载荷计入字节，但不算作文本 token。未知内容块类型也会计量字节，并产生警告。

这是**基于样本的测量，不是生产环境的 token 账单**。实际上下文用量还受客户端、提示词拼装、模型 tokenizer 及工具输出转换影响。ToolPayload 不会再次解析藏在字符串里的 JSON。输入文件上限 10 MiB，嵌套上限 100 层，从完整输入的根节点开始计数（JSON-RPC 信封会占一层）。生成的基线若超过 10 MiB，会以退出码 2 结束；可将大量案例拆成多个配置集合。报告和基线不保存原始响应值，但**字段名、案例 ID、路径和诊断代码并未匿名化**，分享产物前请检查。

## 开发

```sh
npm run typecheck
npm run build
npm run demo
```

演示使用仓库中的工具结果示例，并将 HTML 报告写入被 Git 忽略的 `artifacts/` 目录。

项目采用 [MIT 许可证](LICENSE)。
