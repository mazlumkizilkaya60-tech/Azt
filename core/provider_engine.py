
class ProviderEngine:
    def __init__(self):
        self._providers = {}

    def register(self, name, provider):
        self._providers[name] = provider

    def get(self, name):
        return self._providers.get(name)

    def names(self):
        return list(self._providers.keys())
