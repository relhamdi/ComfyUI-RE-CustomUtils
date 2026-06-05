import re

import torch

from ..config import NODE_CATEGORY
from ..utils import clean_prompt


class BreakEncoder:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "clip": ("CLIP",),
                "break_keyword": ("STRING", {"default": "BREAK"}),
                "text": ("STRING", {"multiline": True, "default": ""}),
                "cleanup": ("BOOLEAN", {"default": True}),
            }
        }

    RETURN_TYPES = ("CONDITIONING", "STRING")
    RETURN_NAMES = ("conditioning", "text")
    FUNCTION = "encode"
    CATEGORY = NODE_CATEGORY

    def encode(self, clip, break_keyword, text, cleanup):
        # Validation
        if clip is None:
            raise ValueError("[BreakEncoder] CLIP input is required.")

        if not text.strip():
            raise ValueError("[BreakEncoder] Text input is empty.")

        if not break_keyword.strip():
            raise ValueError("[BreakEncoder] Break keyword cannot be empty.")

        # Split on break keyword (case-sensitive)
        blocks = re.split(rf"\s*{re.escape(break_keyword)}\s*", text)

        # Strip and filter empty blocks
        blocks = [b.strip() for b in blocks]
        blocks = [b for b in blocks if b]

        if not blocks:
            raise ValueError("[BreakEncoder] No valid blocks found after splitting.")

        # Cleanup
        if cleanup:
            blocks = [clean_prompt(b) for b in blocks]
            blocks = [b for b in blocks if b.strip()]

        if not blocks:
            raise ValueError("[BreakEncoder] All blocks were empty after cleanup.")

        # Encode and concat
        conditioning_to = None

        for block in blocks:
            tokens = clip.tokenize(block)
            block_cond = clip.encode_from_tokens_scheduled(tokens)

            if conditioning_to is None:
                conditioning_to = block_cond
                continue

            out = []
            cond_from = block_cond[0][0]

            for i in range(len(conditioning_to)):
                t1 = conditioning_to[i][0]
                tw = torch.cat((t1, cond_from), 1)
                n = [tw, conditioning_to[i][1].copy()]
                out.append(n)

            conditioning_to = out

        output_text = "\n---\n".join(blocks)
        return (conditioning_to, output_text)


# --- Registration ---

NODE_CLASS_MAPPINGS = {
    "BreakEncoder": BreakEncoder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "BreakEncoder": "Break Encoder",
}
