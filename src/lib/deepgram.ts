// Deepgram transcription client
// Supports streaming (WebSocket) and batch (REST) transcription

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY as string

export interface DeepgramWord {
  word: string
  start: number
  end: number
  confidence: number
  punctuated_word?: string
}

export interface DeepgramAlternative {
  transcript: string
  confidence: number
  words: DeepgramWord[]
}

export interface DeepgramResult {
  transcript: string
  confidence: number
  words: DeepgramWord[]
  isFinal: boolean
}

export type TranscriptCallback = (result: DeepgramResult) => void

// ─── Streaming (live microphone) ─────────────────────────────────────────────

let socket: WebSocket | null = null

export function startStreamingTranscription(onResult: TranscriptCallback): WebSocket {
  const url = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&punctuate=true&interim_results=true&utterance_end_ms=1000&vad_events=true`

  socket = new WebSocket(url, ['token', DEEPGRAM_API_KEY])

  socket.addEventListener('open', () => {
    console.log('[Deepgram] WebSocket connected')
  })

  socket.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data as string)
      if (msg.type === 'Results') {
        const alt: DeepgramAlternative = msg.channel?.alternatives?.[0]
        if (!alt || !alt.transcript) return
        onResult({
          transcript: alt.transcript,
          confidence: alt.confidence ?? 0,
          words: alt.words ?? [],
          isFinal: msg.is_final ?? false,
        })
      }
    } catch {
      // ignore parse errors
    }
  })

  socket.addEventListener('close', () => {
    console.log('[Deepgram] WebSocket closed')
  })

  socket.addEventListener('error', (e) => {
    console.error('[Deepgram] WebSocket error', e)
  })

  return socket
}

export function sendAudioChunk(chunk: ArrayBuffer): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(chunk)
  }
}

export function stopStreamingTranscription(): void {
  if (socket) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'CloseStream' }))
    }
    socket.close()
    socket = null
  }
}

// ─── Batch (file upload) ──────────────────────────────────────────────────────

export async function transcribeFile(
  file: File,
  onProgress?: (pct: number) => void
): Promise<DeepgramResult> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('VITE_DEEPGRAM_API_KEY is not set')
  }

  // Simulate progress reporting during upload
  let progressInterval: ReturnType<typeof setInterval> | null = null
  let progress = 0
  if (onProgress) {
    progressInterval = setInterval(() => {
      progress = Math.min(progress + 5, 85)
      onProgress(progress)
    }, 500)
  }

  try {
    const arrayBuffer = await file.arrayBuffer()

    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&punctuate=true&diarize=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': file.type || 'audio/wav',
        },
        body: arrayBuffer,
      }
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Deepgram batch error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const alt: DeepgramAlternative = data.results?.channels?.[0]?.alternatives?.[0]

    if (onProgress) onProgress(100)

    return {
      transcript: alt.transcript ?? '',
      confidence: alt.confidence ?? 0,
      words: alt.words ?? [],
      isFinal: true,
    }
  } finally {
    if (progressInterval) clearInterval(progressInterval)
  }
}
