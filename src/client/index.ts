/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ActivationFunction } from 'vscode-notebook-renderer'

import Channel from "tangle/webviews"

import { OutputType } from '../constants'
import type { CellOutput } from '../types'
import './components'

// ----------------------------------------------------------------------------
// This is the entrypoint to the notebook renderer's webview client-side code.
// This contains some boilerplate that calls the `render()` function when new
// output is available. You probably don't need to change this code; put your
// rendering logic inside of the `render()` function.
// ----------------------------------------------------------------------------

export const activate: ActivationFunction = (context) => ({
  renderOutputItem(outputItem, element) {
    const { output, type } = outputItem.json() as CellOutput

    switch (type) {
      case OutputType.shell:
        const shellElem = document.createElement('shell-output')
        shellElem.innerHTML = output
        element.appendChild(shellElem)
        break
      case OutputType.vercelApp:
        const vercelAppElem = document.createElement('vercel-app')
        vercelAppElem.setAttribute('content', JSON.stringify(output))
        vercelAppElem.addEventListener('project', (event: any) => {
          if (event?.detail) {
            context?.postMessage?.(event.detail)
          }
          return false
        })
        element.appendChild(vercelAppElem)
        break
      case OutputType.vercel:
        const vercelElem = document.createElement('vercel-output')
        vercelElem.setAttribute('content', JSON.stringify(output))
        element.appendChild(vercelElem)
        break
      case OutputType.html:
        const tag = output.isSvelte ? 'svelte-component' : 'vite-output'
        const viteElem = document.createElement(tag)
        viteElem.setAttribute('content', output.content)
        viteElem.setAttribute('port', output.port)
        element.appendChild(viteElem)
        break
      case OutputType.error:
        element.innerHTML = /*html*/`⚠️ ${output}`
        break
      default: element.innerHTML = /*html*/`No renderer found!`
    }
  },
  disposeOutputItem(/* outputId */) {
    // Do any teardown here. outputId is the cell output being deleted, or
    // undefined if we're clearing all outputs.
  }
})
