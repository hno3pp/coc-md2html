from typing import Callable, Type, TypeVar

import injector

from ..infra.libraries.loggers import Logger
from ..libraries.loggers import ILogger

__all__ = ["Provider"]

T = TypeVar("T")


class ProviderBuilder:
    def __init__(self):
        self._injector = injector.Injector(self.__class__.configure)

    @classmethod
    def configure(cls, binder: injector.Binder) -> None:
        binder.bind(ILogger, Logger, scope=injector.SingletonScope)

    def __getitem__(self, klass: Type[T]) -> Callable[[], T]:
        return lambda: self._injector.get(klass)


Provider = ProviderBuilder()
