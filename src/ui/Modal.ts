/**
 * Modal — reusable safe confirmation modal (no browser confirm()).
 */

let modalOpen = false;

export function showModal(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void
): void {
  if (modalOpen) return;
  modalOpen = true;

  const old = document.getElementById('app-modal');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'app-modal';
  overlay.className = 'app-modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'app-modal-dialog';

  const titleEl = document.createElement('div');
  titleEl.className = 'app-modal-title';
  titleEl.textContent = title;

  const textEl = document.createElement('div');
  textEl.className = 'app-modal-text';
  textEl.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'app-modal-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    modalOpen = false;
    overlay.remove();
  });

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn-danger';
  confirmBtn.textContent = confirmLabel;
  confirmBtn.addEventListener('click', () => {
    modalOpen = false;
    overlay.remove();
    onConfirm();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  dialog.appendChild(titleEl);
  dialog.appendChild(textEl);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      modalOpen = false;
      overlay.remove();
    }
  });

  document.body.appendChild(overlay);
  cancelBtn.focus();
}

/**
 * Show an info modal (one button, no confirm action).
 */
export function showInfoModal(title: string, message: string): void {
  if (modalOpen) return;
  modalOpen = true;

  const old = document.getElementById('app-modal');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'app-modal';
  overlay.className = 'app-modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'app-modal-dialog';

  const titleEl = document.createElement('div');
  titleEl.className = 'app-modal-title';
  titleEl.textContent = title;

  const textEl = document.createElement('div');
  textEl.className = 'app-modal-text';
  textEl.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'app-modal-actions';

  const okBtn = document.createElement('button');
  okBtn.className = 'btn btn-primary';
  okBtn.textContent = 'OK';
  okBtn.addEventListener('click', () => {
    modalOpen = false;
    overlay.remove();
  });

  actions.appendChild(okBtn);
  dialog.appendChild(titleEl);
  dialog.appendChild(textEl);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      modalOpen = false;
      overlay.remove();
    }
  });

  document.body.appendChild(overlay);
  okBtn.focus();
}
