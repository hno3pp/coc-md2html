import logging

from ...libraries.loggers import ILogger

__all__ = ["Logger"]


class Logger(ILogger):
    def __init__(self) -> None:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("[%(levelname)s] %(msg)s"))
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.DEBUG)
        logger.addHandler(handler)
        self._logger = logger

    def info(self, message: str) -> None:
        self._logger.info(message)

    def warning(self, message: str) -> None:
        self._logger.warning(message)
