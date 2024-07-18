import { createPromiseClient, Transport } from '@bufbuild/connect'

import { createConnectTransport } from '@bufbuild/connect-node'
import { AIService } from './foyle/v1alpha1/agent_connect'
import { StreamGenerateRequest, FullContext, BlockUpdate } from './foyle/v1alpha1/agent_pb'
import { Doc } from './foyle/v1alpha1/doc_pb'
import * as http2 from 'http2'
import { Observable, fromEventPattern, from, map } from 'rxjs'

const baseUrl = 'http://localhost:8080/api'

// Create a client
const client = createPromiseClient(AIService, createDefaultTransport())

// Function to convert an Observable to an AsyncIterable
export function observableToIterable<T>(observable: Observable<T>): AsyncIterable<T> {
  // Construct and return an object implementating the AsyncIterable protocol
  return {
    [Symbol.asyncIterator]: () => {
      const values: T[] = []
      let resolve: (value: IteratorResult<T>) => void
      let reject: (error: any) => void
      let completed = false
      let error: any = null

      const subscription = observable.subscribe({
        next: (value) => {
          if (resolve) {
            resolve({ value, done: false })
            resolve = undefined
          } else {
            values.push(value)
          }
        },
        error: (err) => {
          error = err
          if (reject) reject(err)
        },
        complete: () => {
          completed = true
          if (resolve) resolve({ value: undefined, done: true })
        },
      })

      // Construct and return an object implementating the iterator protocol
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterator_protocol
      return {
        next: () => {
          return new Promise<IteratorResult<T>>((res, rej) => {
            if (error) {
              rej(error)
            } else if (values.length) {
              res({ value: values.shift()!, done: false })
            } else if (completed) {
              res({ value: undefined, done: true })
            } else {
              resolve = res
              reject = rej
            }
          })
        },
        return: () => {
          subscription.unsubscribe()
          return Promise.resolve({ value: undefined, done: true })
        },
        // The connect method requires this method to be implemented even though it is optional in AsyncIterable.
        // TODO(jeremy): Presumably this is where we need to add error handling.
        throw: (err: any) => {
          subscription.unsubscribe()
          return Promise.reject(err)
        },
      }
    },
  }
}

function createDefaultTransport(): Transport {
  return createConnectTransport({
    // Copied from https://github.com/connectrpc/examples-es/blob/656f27bbbfb218f1a6dce2c38d39f790859298f1/vanilla-node/client.ts#L25
    // Do we need to use http2?
    httpVersion: '2',
    // baseUrl needs to include the path prefix.
    baseUrl: baseUrl,
    nodeOptions: {
      // Create a custom HTTP/2 client
      createClient: (authority) => {
        return http2.connect(authority, {
          // Allow insecure HTTP connections
          rejectUnauthorized: false,
        })
      },
    },
  })
}

export async function callStreamGenerate() {
  try {
    // Create an observable from an array to simulate the events
    // TODO(jeremy): Should we eventually turn this into an observable of TextDocumentChangeEvents
    const data = ['hello', 'how are you?', "Is it me you're looking for?"]
    const inputPipe: Observable<string> = from(data)
    let count = 0
    const requestPipe = inputPipe.pipe(
      map((value: string): StreamGenerateRequest => {
        const blockUpdate = new StreamGenerateRequest({
          request: {
            case: 'update',
            value: new BlockUpdate({
              blockId: `block-${count++}`,
              blockContent: value,
            }),
          },
        })
        return blockUpdate
      }),
    )

    let requestPipeIterable: AsyncIterable<StreamGenerateRequest> =
      observableToIterable(requestPipe)

    // Start the bidirectional stream
    const responseIterable = client.streamGenerate(requestPipeIterable)

    // Await all responses
    console.log('Waiting for responses...')
    for await (const response of responseIterable) {
      console.log('Block Recieved:', response)
    }
    console.log('All responses recieved')
    console.log('Stream closeds...')

    //return responses
  } catch (error) {
    console.error('Error in StreamGenerate:', error)
    throw error
  }
}

export async function callSimpleMethod() {
  // Create a FullContext message
  const fullContext = new FullContext({
    doc: new Doc({
      // Fill in the necessary fields for the Doc message
      // For example:
      // id: "example-doc",
      // blocks: [...],
    }),
    selected: 0,
  })

  // Create a StreamGenerateRequest message
  const request = new StreamGenerateRequest({
    request: {
      case: 'fullContext',
      value: fullContext,
    },
  })

  try {
    // Call the Simple method
    const response = await client.simple(request)
    console.log('Response received simple method:', response)

    // Process the response
    if (response.blocks) {
      response.blocks.forEach((block, index) => {
        console.log(`Block ${index + 1}:`, block)
      })
    } else {
      console.log('No blocks in the response.')
    }
  } catch (error) {
    console.error('Error calling Simple method:', error)
  }
}
