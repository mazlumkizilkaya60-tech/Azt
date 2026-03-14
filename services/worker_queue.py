
import threading, queue

task_queue = queue.Queue()

def worker():
    while True:
        fn,args = task_queue.get()
        try:
            fn(*args)
        except Exception as e:
            print("Worker error:",e)
        task_queue.task_done()

def start_workers(n=2):
    for i in range(n):
        t = threading.Thread(target=worker,daemon=True)
        t.start()

def submit(fn,*args):
    task_queue.put((fn,args))
