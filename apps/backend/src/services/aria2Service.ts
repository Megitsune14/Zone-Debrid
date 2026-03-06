import Logger from '@/base/Logger'

interface Aria2Options {
  dir: string
  out: string
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string
  method: string
  params?: unknown[]
}

interface JsonRpcError {
  code: number
  message: string
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: string
  result?: T
  error?: JsonRpcError
}

const DEFAULT_TIMEOUT_MS = 8000

async function callJsonRpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const body: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    method,
    params
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`Aria2 RPC HTTP ${response.status}`)
    }

    const json = await response.json() as JsonRpcResponse<T>

    if (json.error) {
      throw new Error(`Aria2 RPC error ${json.error.code}: ${json.error.message}`)
    }

    if (json.result === undefined) {
      throw new Error('Réponse Aria2 invalide (result manquant)')
    }

    return json.result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Délai d\'attente dépassé lors de l\'appel Aria2')
    }
    throw error instanceof Error ? error : new Error(String(error))
  } finally {
    clearTimeout(timeout)
  }
}

async function addDownload(
  rpcUrl: string,
  rpcSecret: string | undefined,
  downloadUrl: string,
  options: Aria2Options
): Promise<string> {
  try {
    const params: unknown[] = []
    if (rpcSecret && rpcSecret.trim().length > 0) {
      params.push(`token:${rpcSecret.trim()}`)
    }
    params.push([downloadUrl])
    params.push({
      dir: options.dir,
      out: options.out
    })

    const gid = await callJsonRpc<string>(rpcUrl, 'aria2.addUri', params)
    Logger.success(`Tâche Aria2 ajoutée (GID: ${gid})`)
    return gid
  } catch (error) {
    Logger.error(`Erreur lors de l'ajout d'un téléchargement Aria2: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

async function verifyConnection(
  rpcUrl: string,
  rpcSecret: string | undefined
): Promise<void> {
  const params: unknown[] = []
  if (rpcSecret && rpcSecret.trim().length > 0) {
    params.push(`token:${rpcSecret.trim()}`)
  }

  await callJsonRpc<unknown>(rpcUrl, 'aria2.getVersion', params, 5000)
}

/** Réponse aria2.tellStatus (champs utilisés) */
interface Aria2TellStatusResult {
  status?: string
  totalLength?: string
  completedLength?: string
  downloadSpeed?: string
  errorMessage?: string
}

async function getStatus(
  rpcUrl: string,
  rpcSecret: string | undefined,
  gid: string
): Promise<{
  status: string
  totalLength: number
  completedLength: number
  downloadSpeed: number
  errorMessage?: string
}> {
  const params: unknown[] = []
  if (rpcSecret && rpcSecret.trim().length > 0) {
    params.push(`token:${rpcSecret.trim()}`)
  }
  params.push(gid)

  const result = await callJsonRpc<Aria2TellStatusResult>(rpcUrl, 'aria2.tellStatus', params, 5000)

  const totalLength = parseInt(result.totalLength ?? '0', 10) || 0
  const completedLength = parseInt(result.completedLength ?? '0', 10) || 0
  const downloadSpeed = parseInt(result.downloadSpeed ?? '0', 10) || 0

  return {
    status: result.status ?? 'unknown',
    totalLength,
    completedLength,
    downloadSpeed,
    errorMessage: result.errorMessage
  }
}

async function remove(
  rpcUrl: string,
  rpcSecret: string | undefined,
  gid: string
): Promise<void> {
  const params: unknown[] = []
  if (rpcSecret && rpcSecret.trim().length > 0) {
    params.push(`token:${rpcSecret.trim()}`)
  }
  params.push(gid)
  await callJsonRpc<unknown>(rpcUrl, 'aria2.remove', params, 5000)
}

/**
 * Supprime une tâche Aria2 même en erreur (force remove).
 * À utiliser quand tellStatus retourne status=error pour éviter tâches zombies et spam logs.
 */
async function forceRemove(
  rpcUrl: string,
  rpcSecret: string | undefined,
  gid: string
): Promise<void> {
  const params: unknown[] = []
  if (rpcSecret && rpcSecret.trim().length > 0) {
    params.push(`token:${rpcSecret.trim()}`)
  }
  params.push(gid)
  try {
    await callJsonRpc<unknown>(rpcUrl, 'aria2.forceRemove', params, 5000)
    Logger.info(`Aria2 forceRemove OK pour GID ${gid}`)
  } catch (err) {
    Logger.error(`Aria2 forceRemove pour GID ${gid}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

const aria2Service = {
  addDownload,
  verifyConnection,
  getStatus,
  remove,
  forceRemove
}

export default aria2Service

