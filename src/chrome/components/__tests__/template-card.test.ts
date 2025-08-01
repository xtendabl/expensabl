import { ExpenseTemplate } from '../../../features/templates/types';
import { TemplateCard } from '../template-card';

describe('TemplateCard', () => {
  let container: HTMLDivElement;
  let component: TemplateCard;
  let mockProps: any;

  const mockTemplate: ExpenseTemplate = {
    id: 'template-1',
    name: 'Test Template',
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now() - 3600000, // 1 hour ago
    version: '1.0',
    expenseData: {
      merchantAmount: 150.5,
      merchantCurrency: 'USD',
      date: '2024-01-01',
      merchant: { name: 'Test Merchant' },
      details: {
        description: 'Test expense description',
        category: 'travel',
      },
    },
    scheduling: {
      enabled: true,
      paused: false,
      interval: 'weekly',
      executionTime: { hour: 14, minute: 30 },
      intervalConfig: {},
      nextExecution: Date.now() + 86400000, // Tomorrow
    },
    executionHistory: [
      {
        id: 'exec-1',
        executedAt: Date.now() - 86400000,
        status: 'success',
        expenseId: 'exp-1',
      },
      {
        id: 'exec-2',
        executedAt: Date.now() - 172800000,
        status: 'failed',
        error: 'Network error',
      },
      {
        id: 'exec-3',
        executedAt: Date.now() - 259200000,
        status: 'success',
        expenseId: 'exp-2',
      },
    ],
    metadata: {
      createdFrom: 'manual',
      tags: ['business', 'recurring'],
      favorite: true,
      useCount: 10,
      scheduledUseCount: 8,
      lastUsed: Date.now() - 3600000,
    },
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    mockProps = {
      template: mockTemplate,
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      onToggleFavorite: jest.fn(),
      onToggleScheduling: jest.fn(),
      onUseTemplate: jest.fn(),
    };

    component = new TemplateCard(mockProps);
  });

  afterEach(() => {
    component.unmount();
    document.body.removeChild(container);
  });

  describe('render', () => {
    it('should render template card', () => {
      component.mount(container);

      expect(container.querySelector('.template-card')).toBeTruthy();
      expect(container.querySelector('.template-card-header')).toBeTruthy();
      expect(container.querySelector('.template-card-body')).toBeTruthy();
      expect(container.querySelector('.template-card-actions')).toBeTruthy();
    });

    it('should display template information', () => {
      component.mount(container);

      expect(container.textContent).toContain('Test Template');
      expect(container.textContent).toContain('150.5 USD');
      expect(container.textContent).toContain('Test Merchant');
      expect(container.textContent).toContain('Test expense description');
      expect(container.textContent).toContain('travel');
    });

    it('should show favorite icon when favorited', () => {
      component.mount(container);

      const favoriteBtn = container.querySelector('.favorite-btn');
      expect(favoriteBtn?.classList.contains('active')).toBe(true);
      expect(favoriteBtn?.textContent).toContain('★');
    });

    it('should show scheduled badge and details', () => {
      component.mount(container);

      expect(container.querySelector('.badge.scheduled')).toBeTruthy();
      expect(container.textContent).toContain('weekly');
      expect(container.textContent).toContain('14:30');
      expect(container.textContent).toContain('Next run:');
    });

    it('should show paused state when scheduling is paused', () => {
      mockProps.template = {
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          paused: true,
        },
      };
      component = new TemplateCard(mockProps);
      component.mount(container);

      expect(container.querySelector('.badge.paused')).toBeTruthy();
      expect(container.textContent).toContain('Scheduled (Paused)');
      expect(container.textContent).toContain('Resume');
    });

    it('should not show scheduling info when not scheduled', () => {
      mockProps.template = {
        ...mockTemplate,
        scheduling: null,
      };
      component = new TemplateCard(mockProps);
      component.mount(container);

      expect(container.querySelector('.scheduling-info')).toBeFalsy();
    });
  });

  describe('expand/collapse', () => {
    it('should toggle expanded state when expand button clicked', () => {
      component.mount(container);

      const expandBtn = container.querySelector('.expand-btn') as HTMLButtonElement;
      expect(container.querySelector('.template-card.expanded')).toBeFalsy();

      expandBtn.click();
      expect(container.querySelector('.template-card.expanded')).toBeTruthy();
      expect(container.querySelector('.expanded-content')).toBeTruthy();

      // Need to query the button again after re-render
      const expandBtnAfter = container.querySelector('.expand-btn') as HTMLButtonElement;
      expandBtnAfter.click();
      expect(container.querySelector('.template-card.expanded')).toBeFalsy();
    });

    it('should show usage statistics when expanded', () => {
      component.mount(container);

      const expandBtn = container.querySelector('.expand-btn') as HTMLButtonElement;
      expandBtn.click();

      expect(container.textContent).toContain('Usage Statistics');
      expect(container.textContent).toContain('10'); // Total uses
      expect(container.textContent).toContain('8'); // Scheduled uses
      expect(container.textContent).toContain('67%'); // Success rate (2/3)
    });

    it('should show execution history when expanded', () => {
      component.mount(container);

      const expandBtn = container.querySelector('.expand-btn') as HTMLButtonElement;
      expandBtn.click();

      const historyItems = container.querySelectorAll('.history-item');
      expect(historyItems).toHaveLength(3);
      expect(historyItems[0].classList.contains('success')).toBe(true);
      expect(historyItems[1].classList.contains('failed')).toBe(true);
      expect(historyItems[1].textContent).toContain('Network error');
    });

    it('should show template metadata when expanded', () => {
      component.mount(container);

      const expandBtn = container.querySelector('.expand-btn') as HTMLButtonElement;
      expandBtn.click();

      expect(container.textContent).toContain('Template Details');
      expect(container.textContent).toContain('Created:');
      expect(container.textContent).toContain('Version:');
      expect(container.textContent).toContain('1.0');
      expect(container.textContent).toContain('manual');
    });
  });

  describe('interactions', () => {
    it('should call onToggleFavorite when favorite button clicked', () => {
      component.mount(container);

      const favoriteBtn = container.querySelector('.favorite-btn') as HTMLButtonElement;
      favoriteBtn.click();

      expect(mockProps.onToggleFavorite).toHaveBeenCalledWith('template-1');
    });

    it('should call onUseTemplate when use button clicked', () => {
      component.mount(container);

      const useBtn = container.querySelector('.use-template-btn') as HTMLButtonElement;
      useBtn.click();

      expect(mockProps.onUseTemplate).toHaveBeenCalledWith(mockTemplate);
    });

    it('should call onEdit when edit button clicked', () => {
      component.mount(container);

      const editBtn = container.querySelector('.edit-btn') as HTMLButtonElement;
      editBtn.click();

      expect(mockProps.onEdit).toHaveBeenCalledWith(mockTemplate);
    });

    it('should confirm before calling onDelete', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      component.mount(container);

      const deleteBtn = container.querySelector('.delete-btn') as HTMLButtonElement;
      deleteBtn.click();

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Test Template"?');
      expect(mockProps.onDelete).toHaveBeenCalledWith('template-1');

      confirmSpy.mockRestore();
    });

    it('should not delete when confirm is cancelled', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      component.mount(container);

      const deleteBtn = container.querySelector('.delete-btn') as HTMLButtonElement;
      deleteBtn.click();

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockProps.onDelete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should call onToggleScheduling when toggle button clicked', () => {
      component.mount(container);

      const toggleBtn = container.querySelector('.toggle-scheduling-btn') as HTMLButtonElement;
      toggleBtn.click();

      expect(mockProps.onToggleScheduling).toHaveBeenCalledWith('template-1');
    });
  });

  describe('formatting', () => {
    it('should format dates correctly', () => {
      component.mount(container);

      // Next execution should show future time (in X hours/days or Tomorrow)
      expect(container.textContent).toMatch(/in \d+ hours|Tomorrow/);

      // Expand to see "1 hour ago" for last used
      const expandBtn = container.querySelector('.expand-btn') as HTMLButtonElement;
      expandBtn.click();
      expect(container.textContent).toMatch(/1 hour ago/);
    });

    it('should calculate success rate correctly', () => {
      component.mount(container);

      const expandBtn = container.querySelector('.expand-btn') as HTMLButtonElement;
      expandBtn.click();

      // 2 successes out of 3 = 67%
      expect(container.textContent).toContain('67%');
    });

    it('should handle zero execution history', () => {
      mockProps.template = {
        ...mockTemplate,
        executionHistory: [],
      };
      component = new TemplateCard(mockProps);
      component.mount(container);

      const expandBtn = container.querySelector('.expand-btn') as HTMLButtonElement;
      expandBtn.click();

      expect(container.textContent).toContain('100%'); // Default success rate
      expect(container.querySelector('.execution-history')).toBeFalsy();
    });
  });

  describe('update', () => {
    it('should re-render when template changes', () => {
      component.mount(container);
      expect(container.textContent).toContain('Test Template');

      const updatedTemplate = { ...mockTemplate, name: 'Updated Template' };
      component.update({ template: updatedTemplate });

      expect(container.textContent).toContain('Updated Template');
      expect(container.textContent).not.toContain('Test Template');
    });
  });
});
