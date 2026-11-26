import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  AlertCircle,
  ArrowUp,
  Bookmark,
  Check,
  Clipboard,
  FileText,
  Mic,
  MicOff,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import { sendCopilotMessage } from '../services/copilotService'
import chatbotLauncherImage from '../assets/chatbot.png'
import robotAvatarImage from '../assets/robot.png'
import './AIChatbot.css'

type ChatRole = 'assistant' | 'user'
type ChatFeedback = 'up' | 'down'
type ChatContext = {
  label: string
  status: 'connected' | 'pending' | 'disconnected'
}

type AIChatbotProps = {
  activeContext?: ChatContext
}

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: Date
  kind?: 'welcome' | 'error'
  bookmarked?: boolean
  feedback?: ChatFeedback
  attachments?: File[]
}

type SpeechRecognitionResultLike = ArrayLike<{ transcript: string }>
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> }
type SpeechRecognitionErrorLike = { error: string }
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

const QUICK_ACTIONS = [
  'Summarize active circular',
  'Verify MongoDB Atlas rules',
  'Audit Data Sovereignty',
]

const QUICK_SUGGESTIONS = [
  '⚡ Summarize circular',
  '🛡 Verify MongoDB compliance rules',
  '🔍 Audit data sovereignty',
  '📋 Generate compliance report',
]

const ALLOWED_FILE_EXTENSIONS = new Set(['pdf', 'txt', 'docx', 'csv', 'json'])
const COPILOT_UNAVAILABLE_MESSAGE =
  'Hello! I am your CIDAN AI Regulatory Copilot. I can help organize questions about RBI circulars, banking compliance, and internal policies.'

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createWelcomeMessage(): ChatMessage {
  return {
    id: createMessageId(),
    role: 'assistant',
    content: `${COPILOT_UNAVAILABLE_MESSAGE}\n\nLive rule monitoring and AI responses will be available when the CIDAN Copilot service is connected.\n\nHow can I assist your regulatory audit today?`,
    createdAt: new Date(),
    kind: 'welcome',
  }
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*)/g)
  return tokens.map((token, index) => {
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      return <strong key={index}>{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={index}>{token.slice(1, -1)}</code>
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={index}>{token.slice(1, -1)}</em>
    }
    return <span key={index}>{token}</span>
  })
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push(
        <pre className="chat-code-block" key={`code-${blocks.length}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line)
    if (heading) {
      const HeadingTag = `h${heading[1].length + 2}` as 'h3' | 'h4' | 'h5' | 'h6'
      blocks.push(<HeadingTag key={`heading-${blocks.length}`}>{renderInlineMarkdown(heading[2])}</HeadingTag>)
      index += 1
      continue
    }

    if (line.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const headers = splitTableRow(line)
      index += 2
      const rows: string[][] = []
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      blocks.push(
        <div className="chat-table-scroll" key={`table-${blocks.length}`}>
          <table>
            <thead><tr>{headers.map((cell, cellIndex) => <th key={cellIndex}>{renderInlineMarkdown(cell)}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((_, cellIndex) => (
                    <td key={cellIndex}>{renderInlineMarkdown(row[cellIndex] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    const listMatch = /^\s*([-*+]|\d+\.)\s+(.+)$/.exec(line)
    if (listMatch) {
      const ordered = /^\d+\./.test(listMatch[1])
      const items: string[] = []
      while (index < lines.length) {
        const itemMatch = /^\s*([-*+]|\d+\.)\s+(.+)$/.exec(lines[index])
        if (!itemMatch || /^\d+\./.test(itemMatch[1]) !== ordered) break
        items.push(itemMatch[2])
        index += 1
      }
      const ListTag = ordered ? 'ol' : 'ul'
      blocks.push(
        <ListTag key={`list-${blocks.length}`}>
          {items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(item)}</li>)}
        </ListTag>,
      )
      continue
    }

    const paragraph: string[] = [line]
    index += 1
    while (
      index < lines.length
      && lines[index].trim()
      && !lines[index].trim().startsWith('```')
      && !/^(#{1,4})\s+/.test(lines[index])
      && !(lines[index].includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1]))
      && !/^\s*([-*+]|\d+\.)\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index])
      index += 1
    }
    blocks.push(<p key={`paragraph-${blocks.length}`}>{renderInlineMarkdown(paragraph.join(' '))}</p>)
  }

  return <div className="chat-markdown">{blocks}</div>
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall back to the legacy clipboard command if clipboard permissions are unavailable.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  let copied: boolean
  try {
    textarea.select()
    copied = document.execCommand('copy')
  } finally {
    textarea.remove()
  }
  if (!copied) throw new Error('Clipboard access is unavailable in this browser.')
}

function AIChatbot({ activeContext }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage()])
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isResponding, setIsResponding] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [attachmentError, setAttachmentError] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [copyError, setCopyError] = useState('')
  const [historyNotice, setHistoryNotice] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const voiceBaseMessageRef = useRef('')

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isResponding, isOpen])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [message])

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const submitPrompt = useCallback(async (prompt: string) => {
    const trimmedPrompt = prompt.trim()
    if ((!trimmedPrompt && attachments.length === 0) || isResponding) return
    const requestMessage = trimmedPrompt || 'Please review the attached files for regulatory compliance.'
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'user',
        content: requestMessage,
        createdAt: new Date(),
        attachments: [...attachments],
      },
    ])
    setIsResponding(true)
    setHistoryNotice('')
    try {
      const response = await sendCopilotMessage({
        message: requestMessage,
        context: activeContext
          ? { name: activeContext.label, status: activeContext.status }
          : undefined,
        attachments: [...attachments],
      })
      if (!response.trim()) throw new Error('CIDAN Copilot returned an empty response.')
      setMessages((current) => [
        ...current,
        { id: createMessageId(), role: 'assistant', content: response, createdAt: new Date() },
      ])
      setMessage('')
      setAttachments([])
      setAttachmentError('')
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'The Copilot request could not be completed.'
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: detail,
          createdAt: new Date(),
          kind: 'error',
        },
      ])
    } finally {
      setIsResponding(false)
    }
  }, [activeContext, attachments, isResponding])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitPrompt(message)
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submitPrompt(message)
    }
  }

  function handleNewChat() {
    const hasConversation = messages.length > 1 || attachments.length > 0 || message.trim().length > 0
    if (hasConversation && !window.confirm('Start a new chat? The current conversation will be cleared.')) return
    setMessages([createWelcomeMessage()])
    setMessage('')
    setAttachments([])
    setIsResponding(false)
    setAttachmentError('')
    setVoiceError('')
    setHistoryNotice('')
    setCopyError('')
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.currentTarget.files ?? [])
    const accepted = selectedFiles.filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      return ALLOWED_FILE_EXTENSIONS.has(extension)
    })
    if (accepted.length !== selectedFiles.length) {
      setAttachmentError('Supported file types: PDF, TXT, DOCX, CSV, and JSON.')
    } else {
      setAttachmentError('')
    }
    setAttachments((current) => {
      const uniqueFiles = accepted.filter((file) =>
        !current.some((item) =>
          item.name === file.name && item.size === file.size && item.lastModified === file.lastModified,
        ),
      )
      return [...current, ...uniqueFiles]
    })
    event.currentTarget.value = ''
  }

  function toggleVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const speechWindow = window as SpeechWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceError('Voice input is not supported by this browser.')
      return
    }

    setVoiceError('')
    const recognition = new Recognition()
    recognition.lang = navigator.language || 'en-US'
    recognition.continuous = false
    recognition.interimResults = true
    voiceBaseMessageRef.current = message.trim()
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join('')
        .trim()
      if (transcript) {
        setMessage([voiceBaseMessageRef.current, transcript].filter(Boolean).join(' '))
      }
    }
    recognition.onerror = (event) => {
      setVoiceError(event.error === 'not-allowed'
        ? 'Microphone permission was denied.'
        : `Voice input failed: ${event.error}.`)
      setListening(false)
    }
    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
    } catch {
      setVoiceError('Voice input could not be started. Please try again.')
      recognitionRef.current = null
    }
  }

  function removeAttachment(fileToRemove: File) {
    setAttachments((current) => current.filter((file) => file !== fileToRemove))
  }

  function toggleBookmark(messageId: string) {
    setMessages((current) => current.map((item) =>
      item.id === messageId ? { ...item, bookmarked: !item.bookmarked } : item,
    ))
    setHistoryNotice('Bookmark saved for this session.')
  }

  function setFeedback(messageId: string, feedback: ChatFeedback) {
    setMessages((current) => current.map((item) =>
      item.id === messageId
        ? { ...item, feedback: item.feedback === feedback ? undefined : feedback }
        : item,
    ))
    setHistoryNotice('Feedback saved for this session.')
  }

  async function handleCopyResponse(chatMessage: ChatMessage) {
    try {
      await copyToClipboard(chatMessage.content)
      setCopiedMessageId(chatMessage.id)
      setCopyError('')
      window.setTimeout(() => {
        setCopiedMessageId((current) => current === chatMessage.id ? null : current)
      }, 1800)
    } catch (error: unknown) {
      setCopyError(error instanceof Error ? error.message : 'Could not copy this response.')
    }
  }

  function renderMessage(chatMessage: ChatMessage) {
    const isAssistant = chatMessage.role === 'assistant'
    return (
      <article
        className={`chat-message-row${isAssistant ? ' chat-message-row--assistant' : ' chat-message-row--user'}`}
        key={chatMessage.id}
      >
        {isAssistant && (
          <span className="chat-message-avatar" aria-hidden="true">
            {chatMessage.kind === 'error'
              ? <AlertCircle size={16} />
              : <img src={robotAvatarImage} alt="" />}
          </span>
        )}
        <div className={`chat-message-card${chatMessage.kind === 'error' ? ' chat-message-card--error' : ''}`}>
          <div className="chat-message-meta">
            {isAssistant && (
              chatMessage.kind === 'welcome'
                ? <span className="chat-system-badge"><ShieldCheck size={11} /> SYSTEM READY</span>
                : <strong>{chatMessage.kind === 'error' ? 'Connection issue' : 'CIDAN Copilot'}</strong>
            )}
            <time dateTime={chatMessage.createdAt.toISOString()}>{formatTime(chatMessage.createdAt)}</time>
            {chatMessage.bookmarked && <span className="chat-saved-label">Saved</span>}
          </div>
          <MarkdownContent content={chatMessage.content} />
          {chatMessage.attachments && chatMessage.attachments.length > 0 && (
            <div className="chat-message-attachments">
              {chatMessage.attachments.map((file, index) => (
                <span key={`${file.name}-${index}`}><FileText size={13} />{file.name}</span>
              ))}
            </div>
          )}
          {chatMessage.kind === 'welcome' && (
            <div className="chat-welcome-actions" aria-label="Suggested questions">
              {QUICK_ACTIONS.map((action) => (
                <button key={action} type="button" disabled={isResponding} onClick={() => void submitPrompt(action)}>
                  <ArrowUp size={13} aria-hidden="true" />
                  {action}
                </button>
              ))}
            </div>
          )}
          {isAssistant && chatMessage.kind !== 'welcome' && chatMessage.kind !== 'error' && (
            <div className="chat-message-actions" aria-label="Response actions">
              <button type="button" onClick={() => void handleCopyResponse(chatMessage)} aria-label="Copy response" title="Copy response">
                {copiedMessageId === chatMessage.id ? <Check size={14} /> : <Clipboard size={14} />}
                {copiedMessageId === chatMessage.id && <span>Copied</span>}
              </button>
              <button
                type="button"
                className={chatMessage.bookmarked ? 'is-selected' : ''}
                onClick={() => toggleBookmark(chatMessage.id)}
                aria-label={chatMessage.bookmarked ? 'Remove bookmark' : 'Bookmark response'}
                title={chatMessage.bookmarked ? 'Remove bookmark' : 'Bookmark response'}
              >
                <Bookmark size={14} />
              </button>
              <button
                type="button"
                className={chatMessage.feedback === 'up' ? 'is-selected' : ''}
                onClick={() => setFeedback(chatMessage.id, 'up')}
                aria-label="Helpful response"
                aria-pressed={chatMessage.feedback === 'up'}
                title="Helpful"
              >
                <ThumbsUp size={14} />
              </button>
              <button
                type="button"
                className={chatMessage.feedback === 'down' ? 'is-selected' : ''}
                onClick={() => setFeedback(chatMessage.id, 'down')}
                aria-label="Not helpful response"
                aria-pressed={chatMessage.feedback === 'down'}
                title="Not helpful"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="chatbot">
      {!isOpen && (
        <button
          className="chat-launcher"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open CIDAN AI Copilot"
          aria-expanded={false}
        >
          <img className="chat-launcher-image" src={chatbotLauncherImage} alt="" />
        </button>
      )}
      {isOpen && (
        <div
          className="chat-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <section className="chat-panel" role="dialog" aria-modal="true" aria-label="CIDAN AI Copilot">
            <div className="chat-drag-handle" aria-hidden="true"><span /></div>
            <header className="chat-header">
              <span className="chat-header-icon">
                <img src={robotAvatarImage} alt="" />
              </span>
              <div className="chat-header-identity">
                <div className="chat-title-line">
                  <strong>CIDAN AI Copilot</strong>
                  <span className="chat-pro-badge">PRO 2.4</span>
                </div>
                <span className="chat-connection-status" title="The application has no configured Copilot chat endpoint">
                  <span className="chat-status-dot chat-status-dot--offline" />
                  Offline · Chat service unavailable
                </span>
              </div>
              <button type="button" className="chat-header-action" onClick={handleNewChat} aria-label="Start a new chat" title="New chat" disabled={isResponding}>
                <RefreshCw size={17} aria-hidden="true" />
              </button>
              <button type="button" className="chat-header-action" onClick={() => setIsOpen(false)} aria-label="Close chat" title="Close">
                <X size={19} aria-hidden="true" />
              </button>
            </header>

            <div className="chat-messages" ref={scrollContainerRef} aria-live="polite" aria-relevant="additions text">
              {messages.map(renderMessage)}
              {isResponding && (
                <div className="chat-message-row chat-message-row--assistant" role="status">
                  <span className="chat-message-avatar" aria-hidden="true">
                    <img src={robotAvatarImage} alt="" />
                  </span>
                  <div className="chat-typing-card">
                    <strong>CIDAN is analyzing your compliance context...</strong>
                    <span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-bottom">
              <div className="chat-suggestions" aria-label="Quick suggestions">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={isResponding}
                    onClick={() => void submitPrompt(suggestion.replace(/^[^\w]+\s*/, ''))}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              {(historyNotice || copyError) && (
                <p className="chat-feedback-note" role="status">{copyError || historyNotice}</p>
              )}
              {attachments.length > 0 && (
                <div className="chat-attachment-list" aria-label="Attached files">
                  {attachments.map((file) => (
                    <span className="chat-attachment-chip" key={`${file.name}-${file.size}-${file.lastModified}`}>
                      <FileText size={13} aria-hidden="true" />
                      <span title={file.name}>{file.name}</span>
                      <button type="button" onClick={() => removeAttachment(file)} aria-label={`Remove ${file.name}`}>
                        <X size={13} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {(attachmentError || voiceError) && (
                <p className="chat-input-error" role="alert">{attachmentError || voiceError}</p>
              )}
              <form className="chat-form" onSubmit={handleSubmit}>
                <input
                  ref={fileInputRef}
                  className="chat-file-input"
                  type="file"
                  accept=".pdf,.txt,.docx,.csv,.json,application/pdf,text/plain,text/csv,application/json"
                  multiple
                  onChange={handleFilesSelected}
                  aria-label="Attach files"
                />
                <button
                  className="chat-attach-button"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach files"
                  title="Attach PDF, TXT, DOCX, CSV, or JSON"
                  disabled={isResponding}
                >
                  <Plus size={19} aria-hidden="true" />
                </button>
                <div className="chat-composer">
                  <label className="visually-hidden" htmlFor="chat-message">Ask CIDAN AI Copilot</label>
                  <textarea
                    ref={textareaRef}
                    id="chat-message"
                    rows={1}
                    placeholder="Ask about compliance, rules, RBI..."
                    value={message}
                    onChange={(event) => setMessage(event.currentTarget.value)}
                    onKeyDown={handleInputKeyDown}
                    disabled={isResponding}
                  />
                  <button
                    className={`chat-microphone${listening ? ' chat-microphone--listening' : ''}`}
                    type="button"
                    onClick={toggleVoiceInput}
                    aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                    aria-pressed={listening}
                    title={listening ? 'Stop listening' : 'Voice input'}
                    disabled={isResponding}
                  >
                    {listening ? <MicOff size={17} aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
                  </button>
                </div>
                <button
                  className="chat-send-button"
                  type="submit"
                  disabled={(!message.trim() && attachments.length === 0) || isResponding}
                  aria-label="Send message"
                  title="Send message"
                >
                  {isResponding ? <Send size={17} aria-hidden="true" /> : <ArrowUp size={19} aria-hidden="true" />}
                </button>
              </form>
              <p className="chat-service-note">
                {listening ? 'Listening… your speech will not be sent until you press send.' : 'Enter to send · Shift + Enter for a new line'}
                {attachments.length > 0 && ' · Files remain local until chat upload is supported.'}
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export { AIChatbot }
