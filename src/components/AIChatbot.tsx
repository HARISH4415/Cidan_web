import { useState, type FormEvent } from 'react'
import { Bot, MessageCircle, Send, X } from 'lucide-react'
import './AIChatbot.css'

function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sentMessages, setSentMessages] = useState<string[]>([])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return
    setSentMessages((messages) => [...messages, trimmedMessage])
    setMessage('')
  }

  return (
    <div className="chatbot">
      {isOpen && (
        <section className="chat-panel" aria-label="CIDAN AI Assistant">
          <header className="chat-header">
            <span className="chat-header-icon"><Bot size={19} aria-hidden="true" /></span>
            <div><strong>CIDAN AI Assistant</strong><span>Compliance support</span></div>
            <button type="button" className="chat-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </header>
          <div className="chat-messages" aria-live="polite">
            <p className="chat-welcome">
              Hello! I&apos;m your CIDAN AI Assistant. How can I help you with regulatory compliance today?
            </p>
            {sentMessages.map((sentMessage, index) => (
              <p className="chat-user-message" key={`${index}-${sentMessage}`}>{sentMessage}</p>
            ))}
            <p className="chat-disclaimer">Chat is a visual demo. Messages are not sent and AI replies are not connected.</p>
          </div>
          <form className="chat-form" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="chat-message">Message the CIDAN AI Assistant</label>
            <input
              id="chat-message"
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button type="submit" disabled={!message.trim()} aria-label="Send message">
              <Send size={16} aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
      <button
        className="chat-launcher"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close CIDAN AI Assistant' : 'Open CIDAN AI Assistant'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={23} /> : <MessageCircle size={23} />}
      </button>
    </div>
  )
}

export { AIChatbot }
