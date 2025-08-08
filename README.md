# Open in Browser

A VS Code and Cursor extension that allows you to open files or selected code lines from your Git repository directly in the browser. Supports GitHub, GitLab, Bitbucket, Azure DevOps, and custom Git providers.

## Features

- **Open File in Browser**: Open the current file in your Git repository's web interface
- **Open Selection in Browser**: Open specific lines of code in the browser (supports line ranges)
- **Multiple Git Provider Support**: Works with GitHub, GitLab, Bitbucket, Azure DevOps
- **Custom Provider Configuration**: Add support for private Git instances or custom providers
- **Context Menu Integration**: Right-click context menu options for easy access
- **Smart Line Detection**: Automatically detects selected lines or current cursor position
- **Cursor Support**: Works seamlessly in the Cursor IDE with the same commands and menus

## Usage

### Context Menu

1. **For Files**: Right-click in the editor or on a file in the Explorer → "Git: Open In Browser"
2. **For Selections**: Select text in the editor → Right-click → "Git: Open Selection In Browser"

### Command Palette

- `Git: Open In Browser` - Opens the current file
- `Git: Open Selection In Browser` - Opens the selected lines

### Cursor Compatibility

This extension runs in Cursor out of the box. Use the same Command Palette entries and editor/explorer context menus as in VS Code—no extra setup is required.

## Supported Git Providers

### Built-in Support
- **GitHub** (`github.com`)
- **GitLab** (`gitlab.com`)
- **Bitbucket** (`bitbucket.org`)
- **Azure DevOps** (`dev.azure.com`)

### Custom Providers

You can add support for private Git instances or other providers through VS Code settings.

## Configuration

### Settings

Add these settings to your VS Code settings.json:

```json
{
  "openInBrowser.defaultBranch": "main",
  "openInBrowser.customProviders": [
    {
      "name": "My Private GitLab",
      "domain": "gitlab.mycompany.com",
      "urlTemplate": "https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}#L{startLine}-{endLine}"
    },
    {
      "name": "My Private GitHub Enterprise",
      "domain": "github.mycompany.com",
      "urlTemplate": "https://{domain}/{owner}/{repo}/blob/{branch}/{filePath}#L{startLine}-L{endLine}"
    }
  ]
}
```

### URL Template Placeholders

When configuring custom providers, you can use these placeholders in your `urlTemplate`:

- `{domain}` - Git provider domain (e.g., github.com)
- `{owner}` - Repository owner/organization
- `{repo}` - Repository name
- `{branch}` - Current git branch
- `{filePath}` - Relative file path from repository root
- `{startLine}` - Starting line number
- `{endLine}` - Ending line number

### Configuration Options

- **`openInBrowser.defaultBranch`** (string, default: "main"): Default branch name to use when current branch detection fails
- **`openInBrowser.customProviders`** (array): Array of custom Git provider configurations

## Examples

### Opening a File
1. Open any file in your Git repository
2. Right-click → "Git: Open In Browser"
3. File opens in your browser at the current branch

### Opening Specific Lines
1. Select text in your editor (or just place cursor on a line)
2. Right-click → "Git: Open Selection In Browser"
3. Browser opens showing the exact lines with highlighting

### Custom Provider Example

For a private GitLab instance at `git.mycompany.com`:

```json
{
  "openInBrowser.customProviders": [
    {
      "name": "Company GitLab",
      "domain": "git.mycompany.com",
      "urlTemplate": "https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}#L{startLine}-{endLine}"
    }
  ]
}
```

## Requirements

- VS Code 1.83.0 or higher, or Cursor (based on a compatible VS Code version)
- Git repository with remote origin configured
- Active internet connection to access Git provider web interface

## Supported Git URL Formats

The extension supports various Git remote URL formats including complex repository structures:

### Standard Formats
- **HTTPS**: `https://github.com/owner/repo.git`
- **SSH**: `git@github.com:owner/repo.git`
- **SSH with protocol**: `ssh://git@github.com/owner/repo.git`

### Complex Repository Structures
- **GitLab Groups/Subgroups**: `git@gitlab.company.com:group/subgroup/repo.git`
- **Multi-level paths**: `https://gitlab.company.com/group/subgroup/project.git`

The extension automatically handles GitLab group and subgroup structures, making it work seamlessly with enterprise GitLab instances that use complex repository hierarchies.

## Quick Start Guide

### For Standard Git Providers (GitHub, GitLab.com, etc.)
1. Install the extension
2. Open any file in your Git repository
3. Right-click → "Git: Open In Browser"
4. Done! The file opens in your browser

### For Private Git Instances
1. Add custom provider configuration to VS Code settings
2. Use the extension normally

**Example for private GitLab instance:**
```json
{
  "openInBrowser.customProviders": [
    {
      "name": "Company GitLab",
      "domain": "gitlab.company.com",
      "urlTemplate": "https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}#L{startLine}-{endLine}"
    }
  ]
}
```

## Common Use Cases

### 1. Share Code Links
- Select code lines → Right-click → "Git: Open Selection In Browser"
- Copy the URL from browser to share with colleagues

### 2. View File History
- Open file in browser to access Git history, blame view, etc.

### 3. Code Reviews
- Quickly jump from local development to web interface for creating pull/merge requests

## URL Templates for Popular Git Providers

### GitHub Enterprise
```json
{
  "name": "GitHub Enterprise",
  "domain": "github.company.com",
  "urlTemplate": "https://{domain}/{owner}/{repo}/blob/{branch}/{filePath}#L{startLine}-L{endLine}"
}
```

### GitLab Self-Hosted
```json
{
  "name": "Company GitLab",
  "domain": "gitlab.company.com",
  "urlTemplate": "https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}#L{startLine}-{endLine}"
}
```

### Gitea
```json
{
  "name": "Company Gitea",
  "domain": "git.company.com",
  "urlTemplate": "https://{domain}/{owner}/{repo}/src/branch/{branch}/{filePath}#L{startLine}-L{endLine}"
}
```

### Bitbucket Server
```json
{
  "name": "Bitbucket Server",
  "domain": "bitbucket.company.com",
  "urlTemplate": "https://{domain}/projects/{owner}/repos/{repo}/browse/{filePath}?at={branch}#L{startLine}-{endLine}"
}
```

## Troubleshooting

### "Not a git repository" Error
- **Solution**: Ensure your workspace is a Git repository
- **Check**: Run `git status` in your terminal to verify
- **Verify**: Confirm you have a remote origin with `git remote -v`

### "Unsupported Git provider" Error
- **Solution**: Add a custom provider configuration for your Git hosting service
- **Check**: Verify the domain in your Git remote URL matches a configured provider
- **Example**: If your remote is `git@gitlab.company.com:...`, add a provider with `"domain": "gitlab.company.com"`

### Wrong Branch Opens
- **Cause**: The extension uses your current Git branch
- **Solution**: Switch to the correct branch with `git checkout <branch-name>`
- **Fallback**: If branch detection fails, it uses the configured default branch
- **Configure**: Change default branch in settings: `"openInBrowser.defaultBranch": "develop"`

### Line Numbers Don't Match
- **Cause**: Different line endings or file versions between local and remote
- **Solution**: Ensure your local changes are committed and pushed to the remote repository

### Complex GitLab URLs (Groups/Subgroups)
- **Supported**: The extension now handles complex GitLab structures like `group/subgroup/repo`
- **Example**: `git@gitlab.company.com:frontend-team/web-apps/customer-portal.git` works automatically
- **No Setup Required**: Just add the domain to your custom providers

## Advanced Configuration

### Multiple Custom Providers
You can configure multiple custom Git providers:

```json
{
  "openInBrowser.customProviders": [
    {
      "name": "Internal GitLab",
      "domain": "gitlab.internal.com",
      "urlTemplate": "https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}#L{startLine}-{endLine}"
    },
    {
      "name": "Client GitLab",
      "domain": "gitlab.client.com",
      "urlTemplate": "https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}#L{startLine}-{endLine}"
    },
    {
      "name": "GitHub Enterprise",
      "domain": "github.company.com",
      "urlTemplate": "https://{domain}/{owner}/{repo}/blob/{branch}/{filePath}#L{startLine}-L{endLine}"
    }
  ]
}
```

### Workspace-Specific Settings
Add settings to `.vscode/settings.json` in your project root for team-wide configuration:

```json
{
  "openInBrowser.customProviders": [
    {
      "name": "Project GitLab",
      "domain": "gitlab.project.com",
      "urlTemplate": "https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}#L{startLine}-{endLine}"
    }
  ]
}
```

## Contributing

Issues and pull requests are welcome! Please visit the [GitHub repository](https://github.com/vblinden/open-in-browser) to contribute.

## License

This extension is licensed under the MIT License.
