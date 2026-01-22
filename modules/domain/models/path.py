__all__ = ["Path"]


class Path:
    def __init__(self, path: str) -> None:
        self._path = path

    def __str__(self) -> str:
        return self._path
