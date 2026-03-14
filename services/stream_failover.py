
def choose_stream(primary, backups=None):
    backups = backups or []
    streams = [primary] + backups
    for s in streams:
        if s:
            return s
    return primary
