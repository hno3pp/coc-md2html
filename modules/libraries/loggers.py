import abc

__all__ = ["ILogger"]


class ILogger(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    def info(self, message: str) -> None:
        raise NotImplementedError()

    @abc.abstractmethod
    def warning(self, message: str) -> None:
        raise NotImplementedError()
