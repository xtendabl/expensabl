import { BaseComponent } from '../shared/components/base-component';

interface ChatMessage {
  sender: 'user' | 'system';
  text: string;
}

interface ChatPanelProps {
  onSendMessage: (message: string) => Promise<ChatMessage[]>;
}

interface ChatPanelState {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
}

/**
 * ChatPanel: Guided chat UI for submitting expense reports
 */
export class ChatPanel extends BaseComponent<ChatPanelProps, ChatPanelState> {
  constructor(props: ChatPanelProps) {
    super(props, {
      messages: [
        { sender: 'system', text: 'Hi! What expense report would you like to submit today?' },
      ],
      input: '',
      loading: false,
    });
  }

  render(): string {
    return `
      <div class="chat-panel">
        <div class="chat-messages">
          ${this.state.messages
            .map((msg) => `
              <div class="chat-message ${msg.sender}">
                <span>${this.escapeHtml(msg.text)}</span>
              </div>
            `)
            .join('')}
        </div>
        <form class="chat-input-row">
          <input 
            type="text" 
            class="chat-input" 
            placeholder="Type your message..." 
            value="${this.state.input}" 
            ${this.state.loading ? 'disabled' : ''}
          />
          <button class="btn-primary" type="submit" ${this.state.loading ? 'disabled' : ''}>Send</button>
        </form>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    // Input change
    this.addEventListener('.chat-input', 'input', (e) => {
      const target = e.target as HTMLInputElement;
      this.setState({ input: target.value });
    });

    // Form submit
    this.addEventListener('.chat-input-row', 'submit', (e) => {
      e.preventDefault();
      const input = this.state.input.trim();
      if (!input || this.state.loading) return;

      // Add user message
      this.setState({
        messages: [...this.state.messages, { sender: 'user', text: input }],
        input: '',
        loading: true,
      });

      void this.props.onSendMessage(input)
        .then((responses) => {
          this.setState({
            messages: [...this.state.messages, ...responses],
            loading: false,
          });
        })
        .catch((_err) => {
          this.setState({
            messages: [
              ...this.state.messages,
              { sender: 'system', text: 'Sorry, something went wrong.' },
            ],
            loading: false,
          });
        });
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
