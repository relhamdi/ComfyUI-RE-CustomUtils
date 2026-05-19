# ComfyUI - RE-CustomUtils

A collection of custom nodes for ComfyUI.

> [!NOTE]
> This project was inspired by the [cookiecutter](https://github.com/Comfy-Org/cookiecutter-comfy-extension) template, though the full architecture is a bit different.

## Quickstart

1. Install [ComfyUI](https://docs.comfy.org/get_started).
2. Install [ComfyUI-Manager](https://github.com/ltdrdata/ComfyUI-Manager)
3. Look up this extension in ComfyUI-Manager. If you are installing manually, clone this repository under `ComfyUI/custom_nodes`.
4. Restart ComfyUI.

## Features

### PromptPresetSelector node

![PromptPresetSelector v2.1](docs/images/PromptPresetSelector_v2.1.png)

#### Inputs

- `syntax` (str), default to `{% | %}` — defines the opening tag, separator, and closing tag as a single field, space-separated
- `preset_index` (int), 0-based, default to `0` — loops both ways within range
- `preset_name` (combo) — dynamic dropdown, active when `preset_names` is filled
- `preset_names` (str), optional — comma-separated list of preset names. Ex: `neutral, happy, sad`. If fewer names than presets, remaining are auto-named (`preset_2`, `preset_3`...). If more, extra names are ignored.
- `text` (str), multiline textarea supporting preset blocks
- `cleanup` (bool), default to `True`

#### Outputs

- `text` (str) — the formatted text, with preset blocks resolved
- `preset_index` (int) — the selected index
- `preset_count` (int) — the number of presets found across blocks

#### Usage

Include preset blocks in your `text` using the syntax defined in the `syntax` field. Each block holds options separated by the separator. Depending on `preset_index`, the matching option is injected and the block markers are removed.

```
This is {% an example | a text | another text %} for {% the PromptPresetSelector | the README | %}
```

- `preset_index` = `0` -> `This is an example for the PromptPresetSelector`
- `preset_index` = `1` -> `This is a text for the README`
- `preset_index` = `2` -> `This is another text for`

Empty presets are allowed — the block is simply replaced by an empty string.

#### Custom syntax

The `syntax` field allows changing the opening tag, separator and closing tag. Format is always `open_tag separator close_tag`, space-separated.

```
<< / >>
```

Would match blocks like `<< option_a / option_b >>`.

#### Preset names

When `preset_names` is filled, `preset_index` is replaced by a dynamic dropdown (`preset_name`) built from the comma-separated names. The dropdown resets to the first preset when activated.

If fewer names than presets are defined, remaining entries are auto-named (`preset_2`, `preset_3`...). If more names than presets, extra names are ignored.

#### Validation

The node runs the following checks and stops the workflow on error:

- `syntax` must contain exactly 3 space-separated parts
- `open_tag` and `close_tag` must be different
- All preset blocks in `text` must have the same number of options
- `preset_index` must be within range

#### Cleanup

When `cleanup` is enabled, the following are removed from the output:

- Spaces before commas
- Double or empty commas
- Empty lines

### Web — PromptPresetSelector editor

The `text` widget is replaced by a `contentEditable` div that provides
syntax highlighting:

- Tags and separators are highlighted in orange
- The active preset is shown in full brightness
- Inactive presets are grayed out
- Colors are displayed when the field loses focus, and revert to plain
  text while editing
- Highlighting updates live when `syntax`, `preset_index` or `preset_name`
  are changed

When `preset_names` is filled, and `preset_name` replaces `preset_index`, the dropdown
resets to the first preset when activated.

## TODO

- Add a field to easily concatenate text at the end of the output
- Wildcard mode for presets (randomly selected, index to -1 or -2?)