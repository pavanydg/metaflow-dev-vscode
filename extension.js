const vscode = require('vscode');
const path = require('path');
const { metaflowHoverProvider, loadDecoratorMap } = require('./metaflowHoverProvider');

let sharedTerminal = null;

/**
 * Core function to detect the current Python function name and run a script.
 */
async function runPythonCommand(scriptName) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  await doc.save();

  const cursorLine = editor.selection.active.line;

  // Find the nearest "def"/"async def" above cursor
  let funcName = null;
  for (let i = cursorLine; i >= 0; i--) {
    const lineText = doc.lineAt(i).text.trim();
    const match = lineText.match(/^(?:async\s+def|def)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (match) {
      funcName = match[1];
      break;
    }
  }

  if (!funcName) {
    vscode.window.showErrorMessage("No enclosing Python function found.");
    return;
  }

  const filePath = doc.fileName;
  const fileDir = path.dirname(filePath);

  let command = '';
  if (scriptName == 'spin_func')
    command = `python ${filePath} spin ${funcName}`;
  else
    command = `python ${filePath} run`;

  // Reuse or create a single shared terminal
  if (!sharedTerminal || sharedTerminal.exitStatus !== undefined) {
    sharedTerminal = vscode.window.createTerminal('Metaflow Runner');
  }

  sharedTerminal.show();
  sharedTerminal.sendText(`cd "${fileDir}"`);
  sharedTerminal.sendText(command);

  /*
  vscode.window.showInformationMessage(
    `${scriptName.toUpperCase()}: ${funcName} from ${path.basename(filePath)}`
  );
  */
}

async function activate(context) {
  const runCmd = vscode.commands.registerCommand(
    'extension.runPythonFunction',
    () => runPythonCommand('run_func')
  );

  const spinCmd = vscode.commands.registerCommand(
    'extension.spinPythonFunction',
    () => runPythonCommand('spin_func')
  );

  context.subscriptions.push(runCmd, spinCmd);
  
  // Hover provider
  const hoverDisposable = vscode.languages.registerHoverProvider(
    { scheme: 'file', language: 'python' },
    metaflowHoverProvider
  );
  context.subscriptions.push(hoverDisposable);
  
  await loadDecoratorMap(context);

}

function deactivate() {
  if (sharedTerminal) {
    sharedTerminal.dispose();
    sharedTerminal = null;
  }
}

module.exports = { activate, deactivate };
