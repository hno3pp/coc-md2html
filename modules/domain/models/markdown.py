import unicodedata
from typing import Any, Self

import frontmatter

__all__ = ["Markdown", "NamedMarkdown"]


class Markdown:
    def __init__(self, properties: dict[str, Any] | None, content: str) -> None:
        self.properties = properties or {}
        self.content = content

    @classmethod
    def parse(cls, markdown: str) -> Self:
        properties, content = frontmatter.parse(markdown)
        return cls(properties, content.strip())

    @property
    def index(self) -> int:
        try:
            return int(self.properties["index"])
        except (KeyError, ValueError):
            return -1

    @property
    def title(self) -> str:
        title = self.properties.get("title", "").strip()
        return unicodedata.normalize("NFC", title)


class NamedMarkdown(Markdown):
    def __init__(
        self, name: str, properties: dict[str, Any] | None, content: str
    ) -> None:
        super().__init__(properties, content)
        self.name = name

    @classmethod
    def parse_named(cls, name: str, markdown: str) -> Self:
        properties, content = frontmatter.parse(markdown)
        return cls(name, properties, content.strip())
