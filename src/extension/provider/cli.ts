import { spawn } from 'node:child_process'

import vscode from 'vscode'

import { CLI_RUNNABLE_LANGUAGES } from '../constants'

export class CliProvider implements vscode.NotebookCellStatusBarItemProvider {
  async provideCellStatusBarItems(cell: vscode.NotebookCell): Promise<vscode.NotebookCellStatusBarItem | undefined> {
    /**
     * only show CLI if cliName is known
     */
    if (!cell.metadata?.['cliName']) {
      return
    }

    if (!CLI_RUNNABLE_LANGUAGES.includes(cell.document.languageId)) {
      return
    }

    const item = new vscode.NotebookCellStatusBarItem(
      '$(github-action) CLI',
      vscode.NotebookCellStatusBarAlignment.Right
    )
    item.command = 'runme.runCliCommand'
    return item
  }

  public static async isCliInstalled(): Promise<boolean> {
    const child = spawn('which runme', { shell: true, env: process.env })
    return new Promise<boolean>((resolve, reject) => {
      child.on('exit', () => resolve(child.exitCode === 0))
      child.on('error', (err) => reject(err))
    })
  }
}
