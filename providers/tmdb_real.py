
import os, requests

TMDB_KEY = os.getenv("TMDB_KEY","")

class TMDBProvider:

    def search(self,title):
        if not TMDB_KEY or not title:
            return {}
        try:
            r = requests.get(
                "https://api.themoviedb.org/3/search/multi",
                params={"api_key":TMDB_KEY,"query":title},
                timeout=10
            )
            data=r.json()
            if not data.get("results"):
                return {}
            first=data["results"][0]
            return {
                "poster":"https://image.tmdb.org/t/p/w500"+(first.get("poster_path") or ""),
                "backdrop":"https://image.tmdb.org/t/p/w780"+(first.get("backdrop_path") or ""),
                "overview":first.get("overview",""),
                "rating":first.get("vote_average","")
            }
        except:
            return {}
