export class Toasts {
  private readonly container: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.container = document.createElement("div");
    this.container.className = "toasts";
    root.append(this.container);
  }

  show(message: string): void {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    this.container.append(toast);
    window.setTimeout(() => toast.remove(), 3400);
  }
}
