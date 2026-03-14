
def next_stream(streams, current):
    if current not in streams:
        return streams[0]
    i = streams.index(current)
    if i + 1 < len(streams):
        return streams[i+1]
    return streams[0]
