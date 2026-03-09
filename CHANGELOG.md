# Change Log

All notable changes to the "Open in Browser" extension will be documented in this file.

## [2.2.2] - 2026-03-09

### Fixed
- Use the current short commit hash when opening links from a detached `HEAD` instead of falling back to the configured default branch

## [2.2.1] - 2026-03-09

### Added
- `{owner_basename}` placeholder for custom provider templates

## [2.2.0] - 2026-03-09

### Added
- VS Code `Run Extension` debug configuration for local extension testing
- Optional `urlTemplateNoLines` and `urlTemplateSingleLine` support for custom providers

### Changed
- Replaced the two editor context menu actions with a single `Git: Open In Browser` command
- The command now opens the file when nothing is selected and opens selected lines when text is selected

### Fixed
- No-selection opens no longer append encoded line placeholders for custom providers
- Single-line selections now generate a single-line anchor instead of a range anchor
- Multi-line selections ending at column `0` no longer incorrectly include the following line

## [2.1.0] - 2025-08-08

### Changed
- `Git: Open In Browser` now opens the file without adding a line anchor. To include line numbers or ranges, use `Git: Open Selection In Browser`.

## [2.0.0] - 2025-08-08

### Added
- Documented support for running the extension in Cursor (README update)

### Changed
- Lowered minimum VS Code engine to `^1.83.0` for compatibility with Cursor-based builds

## [0.0.1] - 2025-07-30

### Added
- Initial release of Open in Browser extension
- Support for opening files in Git repository web interfaces
- Support for opening selected lines with line highlighting
- Built-in support for popular Git providers:
  - GitHub (github.com)
  - GitLab (gitlab.com)
  - Bitbucket (bitbucket.org)
  - Azure DevOps (dev.azure.com)
- Custom Git provider configuration support
- Context menu integration for editor and explorer
- Command palette commands:
  - `Git: Open In Browser` - Opens current file
  - `Git: Open Selection In Browser` - Opens selected lines
- Configuration options:
  - `openInBrowser.defaultBranch` - Default branch fallback
  - `openInBrowser.customProviders` - Custom provider definitions
- Support for various Git remote URL formats (HTTPS, SSH)
- Automatic branch detection with fallback to default branch
- Smart line number detection for selections and cursor position

### Features
- Right-click context menu in editor: "Git: Open In Browser"
- Right-click context menu for selections: "Git: Open Selection In Browser"
- Right-click context menu in file explorer: "Git: Open In Browser"
- Automatic detection of Git repository information
- Support for private Git instances through custom provider configuration
- Line range support for code selections
- Fallback handling for various edge cases

### Technical Details
- Built with TypeScript
- Uses VS Code extensibility API
- Integrates with Git command line for repository information
- Supports URL template customization with placeholders
- Error handling and user feedback through VS Code notifications
