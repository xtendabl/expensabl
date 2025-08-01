import { ExpenseTemplate } from '../../../features/templates/types';
import { TemplateList } from '../template-list';

describe('TemplateList', () => {
  let container: HTMLDivElement;
  let component: TemplateList;
  let mockProps: any;

  const now = Date.now();

  const mockTemplate: ExpenseTemplate = {
    id: 'template-1',
    name: 'Test Template',
    createdAt: now - 86400000, // 1 day ago
    updatedAt: now - 86400000,
    version: '1.0',
    expenseData: {
      merchantAmount: 100,
      merchantCurrency: 'USD',
      date: '2024-01-01',
      merchant: { name: 'Test Merchant' },
      details: {
        description: 'Test expense description',
      },
    },
    scheduling: null,
    executionHistory: [],
    metadata: {
      createdFrom: 'manual',
      tags: [],
      favorite: false,
      useCount: 5,
      scheduledUseCount: 0,
      lastUsed: now - 3600000, // 1 hour ago
    },
  };

  const mockScheduledTemplate: ExpenseTemplate = {
    ...mockTemplate,
    id: 'template-2',
    name: 'Scheduled Template',
    scheduling: {
      enabled: true,
      paused: false,
      interval: 'daily',
      executionTime: { hour: 9, minute: 0 },
      intervalConfig: {},
    },
    metadata: {
      ...mockTemplate.metadata,
      favorite: true,
      lastUsed: now, // More recently used
    },
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    mockProps = {
      templates: [mockTemplate, mockScheduledTemplate],
      onSelectTemplate: jest.fn(),
      onCreateTemplate: jest.fn(),
      onDeleteTemplate: jest.fn(),
      selectedTemplateId: undefined,
    };

    component = new TemplateList(mockProps);
  });

  afterEach(() => {
    component.unmount();
    document.body.removeChild(container);
  });

  describe('render', () => {
    it('should render template list', () => {
      component.mount(container);

      expect(container.querySelector('.template-list')).toBeTruthy();
      expect(container.querySelector('.template-list-header')).toBeTruthy();
      expect(container.querySelector('#create-template-btn')).toBeTruthy();
      expect(container.querySelectorAll('.template-item')).toHaveLength(2);
    });

    it('should display template information', () => {
      component.mount(container);

      const firstTemplate = container.querySelector('.template-item');
      expect(firstTemplate?.textContent).toContain('Scheduled Template');
      expect(firstTemplate?.textContent).toContain('Used 5 times');
      expect(firstTemplate?.textContent).toContain('Test expense description');
    });

    it('should show scheduled badge for scheduled templates', () => {
      component.mount(container);

      const items = container.querySelectorAll('.template-item');
      expect(items[0].querySelector('.badge.scheduled')).toBeTruthy();
      expect(items[1].querySelector('.badge.scheduled')).toBeFalsy();
    });

    it('should show favorite icon for favorite templates', () => {
      component.mount(container);

      const items = container.querySelectorAll('.template-item');
      expect(items[0].querySelector('.icon.favorite')).toBeTruthy();
      expect(items[1].querySelector('.icon.favorite')).toBeFalsy();
    });

    it('should highlight selected template', () => {
      mockProps.selectedTemplateId = 'template-2';
      component = new TemplateList(mockProps);
      component.mount(container);

      const items = container.querySelectorAll('.template-item');
      expect(items[0].classList.contains('selected')).toBe(true);
      expect(items[1].classList.contains('selected')).toBe(false);
    });

    it('should show empty state when no templates', () => {
      mockProps.templates = [];
      component = new TemplateList(mockProps);
      component.mount(container);

      expect(container.querySelector('.empty-state')).toBeTruthy();
      expect(container.textContent).toContain('No templates yet');
    });
  });

  describe('interactions', () => {
    it('should call onCreateTemplate when create button clicked', () => {
      component.mount(container);

      const createBtn = container.querySelector('#create-template-btn') as HTMLButtonElement;
      createBtn.click();

      expect(mockProps.onCreateTemplate).toHaveBeenCalled();
    });

    it('should call onSelectTemplate when template clicked', () => {
      component.mount(container);

      const templateItem = container.querySelector('.template-item') as HTMLDivElement;
      templateItem.click();

      expect(mockProps.onSelectTemplate).toHaveBeenCalledWith(mockScheduledTemplate);
    });

    it('should call onDeleteTemplate when delete button clicked', () => {
      component.mount(container);

      const deleteBtn = container.querySelector('.delete-btn') as HTMLButtonElement;
      deleteBtn.click();

      expect(mockProps.onDeleteTemplate).toHaveBeenCalledWith('template-2');
      expect(mockProps.onSelectTemplate).not.toHaveBeenCalled();
    });
  });

  describe('filtering', () => {
    it('should filter templates by search query', () => {
      component.mount(container);

      const searchInput = container.querySelector('#template-search') as HTMLInputElement;
      searchInput.value = 'scheduled';
      searchInput.dispatchEvent(new Event('input'));

      // Wait for re-render
      setTimeout(() => {
        expect(container.querySelectorAll('.template-item')).toHaveLength(1);
        expect(container.textContent).toContain('Scheduled Template');
      }, 0);
    });

    it('should filter by scheduled status', () => {
      component.mount(container);

      const checkbox = container.querySelector('#filter-scheduled') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      // Wait for re-render
      setTimeout(() => {
        expect(container.querySelectorAll('.template-item')).toHaveLength(1);
        expect(container.textContent).toContain('Scheduled Template');
      }, 0);
    });
  });

  describe('update', () => {
    it('should re-render when templates change', () => {
      component.mount(container);
      expect(container.querySelectorAll('.template-item')).toHaveLength(2);

      const newTemplate = { ...mockTemplate, id: 'template-3', name: 'New Template' };
      component.update({ templates: [...mockProps.templates, newTemplate] });

      expect(container.querySelectorAll('.template-item')).toHaveLength(3);
    });
  });
});
