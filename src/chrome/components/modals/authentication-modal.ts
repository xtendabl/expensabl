import { Modal } from './modal';
import { modalManager } from './modal-manager';

export interface AuthenticationModalOptions {
  onAuthenticated?: () => void | Promise<void>;
  onCancel?: () => void;
  sendMessage: (message: Record<string, unknown>) => Promise<Record<string, unknown>>;
  maxRetries?: number;
}

export class AuthenticationModal extends Modal {
  private sendMessage: (message: Record<string, unknown>) => Promise<Record<string, unknown>>;
  private onAuthenticated?: () => void | Promise<void>;
  private onCancel?: () => void;
  private retryCount = 0;
  private maxRetries: number;
  private isChecking = false;
  private checkInterval?: number;

  constructor(options: AuthenticationModalOptions) {
    const content = document.createElement('div');
    content.className = 'auth-modal-content';
    content.innerHTML = `
      <div class="auth-modal-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="auth-modal-message">
        <h3>Authentication Required</h3>
        <p>Please log in to Navan to use this extension.</p>
        <p class="auth-modal-instructions">
          Click "Open Navan" to log in, then click "Check Authentication" to continue.
        </p>
      </div>
      <div class="auth-modal-status" id="authStatus" style="display: none;"></div>
      <div class="auth-modal-error" id="authError" style="display: none;"></div>
    `;

    super({
      title: 'Authentication Required',
      content,
      className: 'authentication-modal',
      closable: true,
      closeOnBackdrop: false,
      closeOnEsc: true,
      buttons: [
        {
          text: 'Open Navan',
          className: 'modal-button-primary',
          onClick: () => this.openNavan(),
          closeOnClick: false,
        },
        {
          text: 'Check Authentication',
          className: 'modal-button-secondary',
          onClick: () => this.checkAuthentication(),
          closeOnClick: false,
        },
      ],
      onClose: () => {
        this.stopAutoCheck();
        if (this.onCancel) {
          this.onCancel();
        }
      },
    });

    this.sendMessage = options.sendMessage;
    this.onAuthenticated = options.onAuthenticated;
    this.onCancel = options.onCancel;
    this.maxRetries = options.maxRetries || 3;

    // Start auto-checking for authentication
    this.startAutoCheck();
  }

  private openNavan(): void {
    window.open('https://app.navan.com', '_blank');

    // Show status message
    const status = this.getElement().querySelector('#authStatus') as HTMLElement;
    if (status) {
      status.style.display = 'block';
      status.innerHTML = `
        <span class="auth-modal-info">
          Navan opened in a new tab. Please log in and then click "Check Authentication".
        </span>
      `;
    }
  }

  private async checkAuthentication(): Promise<void> {
    if (this.isChecking) return;

    this.isChecking = true;
    this.retryCount++;

    const status = this.getElement().querySelector('#authStatus') as HTMLElement;
    const error = this.getElement().querySelector('#authError') as HTMLElement;
    const buttons = this.getElement().querySelectorAll('.modal-button');
    const checkButton = buttons[1] as HTMLButtonElement;

    // Show loading state
    if (status) {
      status.style.display = 'block';
      status.innerHTML = '<span class="loading-spinner"></span>Checking authentication...';
    }
    if (error) {
      error.style.display = 'none';
    }

    // Disable buttons while checking
    buttons.forEach((btn) => ((btn as HTMLButtonElement).disabled = true));

    try {
      const response = await this.sendMessage({ action: 'checkAuth' });

      if (response.success && response.hasToken && response.isValid) {
        // Authentication successful
        if (status) {
          status.innerHTML = `
            <span class="auth-modal-success">
              ✓ Authentication successful!
            </span>
          `;
        }

        // Auto-close after brief delay
        setTimeout(async () => {
          this.stopAutoCheck();
          this.close();
          if (this.onAuthenticated) {
            await this.onAuthenticated();
          }
        }, 1000);
      } else {
        // Authentication failed
        if (this.retryCount >= this.maxRetries) {
          // Max retries reached
          if (error) {
            error.style.display = 'block';
            error.innerHTML = `
              Authentication check failed after ${this.maxRetries} attempts. 
              Please ensure you are logged in to Navan and try again.
            `;
          }
          if (status) {
            status.style.display = 'none';
          }
        } else {
          // Show retry message
          if (status) {
            status.innerHTML = `
              <span class="auth-modal-warning">
                Not authenticated yet. Please log in to Navan and try again.
                (Attempt ${this.retryCount}/${this.maxRetries})
              </span>
            `;
          }
        }
      }
    } catch (err) {
      // Error checking authentication
      if (error) {
        error.style.display = 'block';
        error.textContent = 'Error checking authentication. Please try again.';
      }
      if (status) {
        status.style.display = 'none';
      }
    } finally {
      this.isChecking = false;
      // Re-enable buttons
      buttons.forEach((btn) => ((btn as HTMLButtonElement).disabled = false));

      // Update check button text if max retries reached
      if (this.retryCount >= this.maxRetries) {
        checkButton.textContent = 'Retry';
        this.retryCount = 0; // Reset counter for new attempt cycle
      }
    }
  }

  private startAutoCheck(): void {
    // Check authentication every 2 seconds automatically
    this.checkInterval = window.setInterval(async () => {
      if (!this.isChecking) {
        const response = await this.sendMessage({ action: 'checkAuth' });
        if (response && response.success && response.hasToken && response.isValid) {
          // Authentication successful
          const status = this.getElement().querySelector('#authStatus') as HTMLElement;
          if (status) {
            status.style.display = 'block';
            status.innerHTML = `
              <span class="auth-modal-success">
                ✓ Authentication detected! Closing...
              </span>
            `;
          }

          // Auto-close
          setTimeout(async () => {
            this.stopAutoCheck();
            this.close();
            if (this.onAuthenticated) {
              await this.onAuthenticated();
            }
          }, 1000);
        }
      }
    }, 2000);
  }

  private stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }
}

export function showAuthenticationModal(options: AuthenticationModalOptions): AuthenticationModal {
  const modal = new AuthenticationModal(options);
  modalManager.open(modal);
  return modal;
}
