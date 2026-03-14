
class EPGTimeline:

    def timeline(self, programs):
        out = []
        for p in programs:
            out.append({
                "title": p.get("title"),
                "start": p.get("start"),
                "end": p.get("end")
            })
        return out
