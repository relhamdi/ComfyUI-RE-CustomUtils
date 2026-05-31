import sys
from unittest.mock import MagicMock

# Mock heavy dependencies before any import
sys.modules["torch"] = MagicMock()
sys.modules["comfy"] = MagicMock()
sys.modules["comfy.sd"] = MagicMock()
sys.modules["comfy.utils"] = MagicMock()
sys.modules["comfy.samplers"] = MagicMock()
sys.modules["folder_paths"] = MagicMock()
sys.modules["server"] = MagicMock()
