from typing import TypeVar

from anthropic import Anthropic
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class AnthropicClient:
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-opus-4-6"

    def generate_response(self, prompt: str, response_format):
        response = self.client.messages.parse(
            model=self.model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
            output_format=response_format,
        )
        if response.parsed_output is None:
            raise ValueError("Failed to parse response")
        return response.parsed_output

    def generate_response_pdf(self, prompt: str, doc: str, response_format):
        response = self.client.messages.parse(
            model=self.model,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": doc,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
            output_format=response_format,
        )
        return response.parsed_output
