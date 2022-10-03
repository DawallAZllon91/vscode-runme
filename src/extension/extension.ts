import vscode from "vscode"
import { Serializer } from './notebook'
import { Kernel } from "./kernel"
import { DeployProvider, ThumbsDownProvider, ThumbsUpProvider } from './provider/rating'
import { ViteServer } from "./server"

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Runme] Activating Extension')

  const server = await ViteServer.create(context)
  const kernel = new Kernel(context)

  context.subscriptions.push(
    kernel,
    server,
    vscode.workspace.registerNotebookSerializer("runme", new Serializer(context), {
      transientOutputs: true,
      transientCellMetadata: {
        inputCollapsed: true,
        outputCollapsed: true,
      },
    }),
    vscode.notebooks.registerNotebookCellStatusBarItemProvider(
      "runme",
      new ThumbsUpProvider()
    ),
    vscode.notebooks.registerNotebookCellStatusBarItemProvider(
      "runme",
      new ThumbsDownProvider()
    ),
    vscode.notebooks.registerNotebookCellStatusBarItemProvider(
      "runme",
      new DeployProvider()
    )
  )

  console.log('[Runme] Extension successfully activated')
}

// This method is called when your extension is deactivated
export function deactivate() { }
