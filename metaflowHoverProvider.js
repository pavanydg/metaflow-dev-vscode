const vscode = require('vscode');
const path   = require('path');
const cp     = require('child_process');

const INTROSPECT_SCRIPT = path.join(__dirname, 'metaflow_introspect.py');
let _decoratorMap = null;

async function resolvePythonPath() {
  try {
    const pythonExt = vscode.extensions.getExtension('ms-python.python');
    if (pythonExt) {
      if (!pythonExt.isActive) await pythonExt.activate();
      const api = pythonExt.exports;
      if (api?.settings?.getExecutionDetails) {
        const details = api.settings.getExecutionDetails();
        if (details?.execCommand?.[0]) return details.execCommand[0];
      }
      if (api?.environments?.getActiveEnvironmentPath) {
        const envPath = await api.environments.getActiveEnvironmentPath();
        if (envPath?.path) return envPath.path;
      }
    }
  } catch (_) {}

  const fromSetting = vscode.workspace.getConfiguration('python').get('defaultInterpreterPath');
  if (fromSetting && fromSetting !== 'python') return fromSetting;
  return 'python3';
}

function runIntrospectionScript(pythonPath) {
  return new Promise((resolve, reject) => {
    cp.execFile(pythonPath, [INTROSPECT_SCRIPT], { timeout: 15_000 }, (err, stdout, stderr) => {
      if (err) return reject(`Introspection failed:\n${stderr || err.message}`);
      try {
        const data = JSON.parse(stdout);
        data.__error__ ? reject(data.__error__) : resolve(data);
      } catch (e) {
        reject(`Could not parse output: ${e.message}\nRaw: ${stdout.slice(0, 300)}`);
      }
    });
  });
}

async function loadDecoratorMap(context) {
  _decoratorMap = null;

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  status.text = '$(sync~spin) Metaflow: loading decorators…';
  status.show();
  context.subscriptions.push(status);

  try {
    const pythonPath = await resolvePythonPath();
    _decoratorMap = await runIntrospectionScript(pythonPath);
    status.text = `$(check) Metaflow: ${Object.keys(_decoratorMap).length} decorators loaded`;
    setTimeout(() => status.hide(), 4000);
  } catch (err) {
    status.text = '$(warning) Metaflow: decorator introspection failed';
    status.tooltip = String(err);
    setTimeout(() => status.hide(), 8000);
    console.error('[metaflow-hover]', err);
  }
}

function buildTooltip(name, meta) {
  const md = new vscode.MarkdownString('', true);
  md.isTrusted = true;

  md.appendMarkdown(`### \`@${name}\` _(${meta.kind} decorator)_\n\n`);
  if (meta.summary) md.appendMarkdown(`${meta.summary}\n\n`);

  const params = Object.entries(meta.params);
  if (params.length === 0) {
    md.appendMarkdown('_No parameters._\n\n');
  } else {
    md.appendMarkdown('**Parameters**\n\n');
    md.appendMarkdown('| Name | Type | Default | Description |\n');
    md.appendMarkdown('|------|------|---------|-------------|\n');
    for (const [pName, p] of params) {
      const def = p.default === null ? '`None`' : p.default === '' ? '`""`' : `\`${JSON.stringify(p.default)}\``;
      md.appendMarkdown(`| \`${pName}\` | \`${p.type}\` | ${def} | ${p.doc || '—'} |\n`);
    }
    md.appendMarkdown('\n');
  }

  md.appendMarkdown(`[$(book) Open documentation](${meta.doc_url})\n`);
  return md;
}

const metaflowHoverProvider = {
  provideHover(document, position) {
    if (!_decoratorMap) return;

    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/);
    if (!wordRange) return;

    const word = document.getText(wordRange);
    if (!_decoratorMap[word]) return;

    // Check character before word is '@'
    const charBefore = wordRange.start.character > 0
      ? document.getText(new vscode.Range(wordRange.start.translate(0, -1), wordRange.start))
      : '';
    if (charBefore !== '@') return;

    return new vscode.Hover(buildTooltip(word, _decoratorMap[word]), wordRange);
  }
};

module.exports = { loadDecoratorMap, metaflowHoverProvider };