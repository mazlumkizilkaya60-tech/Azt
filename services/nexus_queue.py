
import threading, queue

_jobs = queue.Queue()

def worker():
    while True:
        fn, args, kwargs = _jobs.get()
        try:
            fn(*args, **kwargs)
        except Exception as e:
            print('NEXUS QUEUE ERROR', e)
        finally:
            _jobs.task_done()

def start(count=2):
    for _ in range(count):
        t = threading.Thread(target=worker, daemon=True)
        t.start()

def push(fn, *args, **kwargs):
    _jobs.put((fn, args, kwargs))
