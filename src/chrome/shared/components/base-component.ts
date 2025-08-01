/**
 * Base component class for all UI components in the Chrome extension.
 * Provides lifecycle methods, state management, and DOM manipulation utilities.
 */
export abstract class BaseComponent<Props = {}, State = {}> {
  protected element: HTMLElement | null = null;
  protected props: Props;
  protected state: State;
  private mounted = false;
  private eventListeners: Array<{
    element: Element | Window | Document;
    event: string;
    handler: EventListener;
  }> = [];

  constructor(props: Props, initialState: State) {
    this.props = props;
    this.state = initialState;
  }

  /**
   * Renders the component's HTML template.
   * Must be implemented by all components.
   */
  abstract render(): string;

  /**
   * Attaches event listeners after the component is mounted.
   * Override this method to add component-specific event handlers.
   */
  protected attachEventListeners(): void {
    // Override in subclasses
  }

  /**
   * Called before the component updates.
   * Return false to prevent the update.
   */
  protected shouldUpdate(_newProps: Partial<Props>): boolean {
    return true;
  }

  /**
   * Called after the component updates.
   */
  protected onUpdate(): void {
    // Override in subclasses
  }

  /**
   * Called after the component mounts to the DOM.
   */
  protected onMount(): void {
    // Override in subclasses
  }

  /**
   * Called before the component unmounts from the DOM.
   */
  protected onUnmount(): void {
    // Override in subclasses
  }

  /**
   * Mounts the component to a container element.
   */
  mount(container: HTMLElement): void {
    if (this.mounted) {
      return; // Component already mounted
    }

    const html = this.render();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    this.element = wrapper.firstElementChild as HTMLElement;

    if (!this.element) {
      throw new Error('Component render() must return valid HTML');
    }

    container.appendChild(this.element);
    this.mounted = true;
    this.attachEventListeners();
    this.onMount();
  }

  /**
   * Updates the component with new props.
   */
  update(newProps: Partial<Props>): void {
    if (!this.mounted || !this.element) {
      throw new Error('Component must be mounted before updating');
    }

    if (!this.shouldUpdate(newProps)) {
      return;
    }

    this.props = { ...this.props, ...newProps };

    // Re-render and replace content
    const html = this.render();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    const newElement = wrapper.firstElementChild as HTMLElement;

    if (!newElement) {
      throw new Error('Component render() must return valid HTML');
    }

    // Preserve element reference and update content
    this.element.replaceWith(newElement);
    this.element = newElement;

    // Re-attach event listeners
    this.removeAllEventListeners();
    this.attachEventListeners();
    this.onUpdate();
  }

  /**
   * Updates the component's state and triggers a re-render.
   */
  protected setState(newState: Partial<State>): void {
    this.state = { ...this.state, ...newState };
    this.update({} as Partial<Props>);
  }

  /**
   * Unmounts the component from the DOM.
   */
  unmount(): void {
    if (!this.mounted || !this.element) {
      return;
    }

    this.onUnmount();
    this.removeAllEventListeners();
    this.element.remove();
    this.element = null;
    this.mounted = false;
  }

  /**
   * Adds an event listener that will be automatically cleaned up.
   */
  protected addEventListener(
    target: Element | Window | Document | string,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    let element: Element | Window | Document;

    if (typeof target === 'string') {
      const selected = this.element?.querySelector(target);
      if (!selected) {
        return; // Element not found
      }
      element = selected;
    } else {
      element = target;
    }

    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler });
  }

  /**
   * Removes all registered event listeners.
   */
  private removeAllEventListeners(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Queries for an element within the component.
   */
  protected querySelector<T extends Element = Element>(selector: string): T | null {
    return this.element?.querySelector<T>(selector) || null;
  }

  /**
   * Queries for all elements within the component.
   */
  protected querySelectorAll<T extends Element = Element>(selector: string): NodeListOf<T> {
    return this.element?.querySelectorAll<T>(selector) || ([] as unknown as NodeListOf<T>);
  }

  /**
   * Gets the component's root element.
   */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Checks if the component is mounted.
   */
  isMounted(): boolean {
    return this.mounted;
  }
}
