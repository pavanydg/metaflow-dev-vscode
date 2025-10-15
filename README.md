# Metaflow Shortcuts for VSCode

This lightweight VS Code extension supercharges your Metaflow dev workflow:

1. Develop a flow
2. Run the flow with **Ctrl + Opt + R**
3. Point at a step, edit it, and _spin_ it with **Ctrl + Opt + S** for quick results ⚡
4. Rinse and repeat 2-3

The extension automatically:

* Detects the current function name (`def` or `async def`)
* Saves the file before running
* Executes the command in the file’s directory
* Reuses a shared terminal session

##  Installation

1. **Clone or copy** this repository to a local folder

2. **Install the VSCE packager** (if not already):

   ```bash
   npm install -g @vscode/vsce
   ```

3. **Build the `.vsix` package:**

   ```bash
   vsce package
   ```

   This creates a file like:

   ```
   metaflow-dev-0.0.7.vsix
   ```

4. **Install it in VS Code:**

   * Open **Command Palette → Extensions: Install from VSIX...**
   * Choose the generated `.vsix` file
     or run in terminal:

     ```bash
     code --install-extension metaflow-dev-0.0.7.vsix
     ```

5. Reload VS Code window. You’re good to go.

## Optional Customization

You can modify the script names or keybindings in `package.json`:

```json
"keybindings": [
  { "command": "extension.runPythonFunction", "key": "ctrl+alt+r" },
  { "command": "extension.spinPythonFunction", "key": "ctrl+alt+s" }
]
```

