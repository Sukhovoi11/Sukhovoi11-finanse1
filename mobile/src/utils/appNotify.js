const listeners = new Set();
const pendingQueue = [];
const MAX_PENDING_TOASTS = 8;

export const subscribeNotify = (listener) => {
  listeners.add(listener);

  if (pendingQueue.length) {
    pendingQueue.splice(0, pendingQueue.length).forEach((payload) => {
      listener(payload);
    });
  }

  return () => {
    listeners.delete(listener);
  };
};

export const notify = (title, message, type = 'info') => {
  const payload = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: String(title || ''),
    message: String(message || ''),
    type,
  };

  if (!listeners.size) {
    pendingQueue.push(payload);
    if (pendingQueue.length > MAX_PENDING_TOASTS) {
      pendingQueue.shift();
    }
    return;
  }

  listeners.forEach((listener) => listener(payload));
};
