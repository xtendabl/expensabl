import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  MessageResponse,
  HandlerDependencies,
  createSuccessResponse,
} from '../../types';

interface OpenSidePanelResult {
  opened: boolean;
  windowId?: number;
}

/**
 * Handler for opening the Chrome side panel
 */
export class OpenSidePanelHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.OPEN_SIDE_PANEL>
> {
  readonly action = MessageAction.OPEN_SIDE_PANEL;

  protected async execute(
    _message: ExtractMessageByAction<MessageAction.OPEN_SIDE_PANEL>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse<OpenSidePanelResult>> {
    deps.logger.info('OpenSidePanelHandler: Opening side panel');

    try {
      // Check if chrome.sidePanel API is available
      if (!chrome.sidePanel) {
        throw new Error('Side panel API not available');
      }

      // Get the window ID from the sender if available
      const windowId = sender.tab?.windowId;

      if (windowId) {
        // Open side panel for specific window
        await chrome.sidePanel.open({ windowId });

        deps.logger.info('OpenSidePanelHandler: Side panel opened', { windowId });

        return createSuccessResponse({
          opened: true,
          windowId,
        });
      } else {
        // Open side panel without windowId - just call setOptions and setPanelBehavior
        // The side panel will open when user clicks the extension icon
        await chrome.sidePanel.setOptions({
          enabled: true,
          path: 'sidepanel.html',
        });

        deps.logger.info('OpenSidePanelHandler: Side panel enabled');

        return createSuccessResponse({
          opened: true,
        });
      }
    } catch (error) {
      deps.logger.error('OpenSidePanelHandler: Failed to open side panel', { error });
      throw error;
    }
  }
}
