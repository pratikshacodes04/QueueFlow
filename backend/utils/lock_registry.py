import threading
from typing import Dict

# Global registry mapping queue_id (str) to a threading.Lock
_lock_registry: Dict[str, threading.Lock] = {}
_registry_lock = threading.Lock()

def get_queue_lock(queue_id: str) -> threading.Lock:
    """Return a lock for the given queue_id, creating it if necessary.
    The registry itself is protected by a global lock to avoid race conditions.
    """
    with _registry_lock:
        if queue_id not in _lock_registry:
            _lock_registry[queue_id] = threading.Lock()
        return _lock_registry[queue_id]

