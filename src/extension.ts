// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GitRemoteInfo {
	domain: string;
	owner: string;
	repo: string;
}

interface GitProvider {
	name: string;
	domain: string;
	urlTemplate: string;
}

const DEFAULT_PROVIDERS: GitProvider[] = [
	{
		name: 'GitHub',
		domain: 'github.com',
		urlTemplate: 'https://{domain}/{owner}/{repo}/blob/{branch}/{filePath}#L{startLine}-L{endLine}'
	},
	{
		name: 'GitLab',
		domain: 'gitlab.com',
		urlTemplate: 'https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}#L{startLine}-{endLine}'
	},
	{
		name: 'Bitbucket',
		domain: 'bitbucket.org',
		urlTemplate: 'https://{domain}/{owner}/{repo}/src/{branch}/{filePath}#lines-{startLine}:{endLine}'
	},
	{
		name: 'Azure DevOps',
		domain: 'dev.azure.com',
		urlTemplate: 'https://{domain}/{owner}/{repo}?path=/{filePath}&version=GB{branch}&line={startLine}&lineEnd={endLine}&lineStartColumn=1&lineEndColumn=1'
	}
];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Extension "open-in-browser" is now active!');

	// Register command to open file in browser
	const openFileDisposable = vscode.commands.registerCommand('open-in-browser.openFile', async (uri?: vscode.Uri) => {
		try {
			await openInBrowser(uri);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open in browser: ${error}`);
		}
	});

	// Register command to open selection in browser
	const openSelectionDisposable = vscode.commands.registerCommand('open-in-browser.openSelection', async (uri?: vscode.Uri) => {
		try {
			await openInBrowser(uri, true);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open selection in browser: ${error}`);
		}
	});

	context.subscriptions.push(openFileDisposable, openSelectionDisposable);
}

async function openInBrowser(uri?: vscode.Uri, useSelection: boolean = false): Promise<void> {
	const activeEditor = vscode.window.activeTextEditor;

	// Determine the file URI
	let fileUri: vscode.Uri;
	if (uri) {
		fileUri = uri;
	} else if (activeEditor) {
		fileUri = activeEditor.document.uri;
	} else {
		throw new Error('No file selected or active');
	}

	// Get workspace folder
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
	if (!workspaceFolder) {
		throw new Error('File is not in a workspace');
	}

	// Get git repository information
	const gitInfo = await getGitInfo(workspaceFolder.uri.fsPath);
	if (!gitInfo) {
		throw new Error('Not a git repository or unable to determine remote URL');
	}

	// Get relative file path
	const relativePath = path.relative(workspaceFolder.uri.fsPath, fileUri.fsPath);

	// Get line numbers if selection is requested
	let startLine = 1;
	let endLine = 1;

	if (useSelection && activeEditor && activeEditor.document.uri.toString() === fileUri.toString()) {
		const selection = activeEditor.selection;
		startLine = selection.start.line + 1; // VS Code lines are 0-indexed
		endLine = selection.end.line + 1;

		// If no selection, use current line
		if (selection.isEmpty) {
			startLine = endLine = selection.active.line + 1;
		}
	}

	// Get current branch
	const branch = await getCurrentBranch(workspaceFolder.uri.fsPath);

	// Build URL
	const url = buildUrl(gitInfo, relativePath, branch, startLine, endLine);

	// Open in browser
	await vscode.env.openExternal(vscode.Uri.parse(url));
	vscode.window.showInformationMessage(`Opened in browser: ${url}`);
}

async function getGitInfo(workspacePath: string): Promise<GitRemoteInfo | null> {
	try {
		const { stdout } = await execAsync('git remote get-url origin', { cwd: workspacePath });
		const remoteUrl = stdout.trim();

		return parseGitRemoteUrl(remoteUrl);
	} catch (error) {
		console.error('Error getting git remote URL:', error);
		return null;
	}
}

function parseGitRemoteUrl(remoteUrl: string): GitRemoteInfo | null {
	// Handle various Git URL formats
	const patterns = [
		// HTTPS: https://github.com/owner/repo.git or https://gitlab.com/group/subgroup/repo.git
		/^https?:\/\/([^\/]+)\/(.+?)\/([^\/]+?)(?:\.git)?$/,

		// SSH: git@github.com:owner/repo.git or git@gitlab.com:group/subgroup/repo.git
		/^git@([^:]+):(.+?)\/([^\/]+?)(?:\.git)?$/,

		// SSH with protocol: ssh://git@github.com/owner/repo.git or ssh://git@gitlab.com/group/subgroup/repo.git
		/^ssh:\/\/git@([^\/]+)\/(.+?)\/([^\/]+?)(?:\.git)?$/
	];

	for (const pattern of patterns) {
		const match = remoteUrl.match(pattern);

		if (match) {
			const domain = match[1];
			const fullPath = match[2];
			const repo = match[3];

			// For complex paths like "group/project", we'll use the full path as owner
			// This works for GitLab groups/subgroups and similar hierarchical structures
			return {
				domain: domain,
				owner: fullPath,
				repo: repo
			};
		}
	}

	return null;
}

async function getCurrentBranch(workspacePath: string): Promise<string> {
	try {
		const { stdout } = await execAsync('git branch --show-current', { cwd: workspacePath });
		const branch = stdout.trim();

		if (branch) {
			return branch;
		}

		// Fallback for detached HEAD or older git versions
		const { stdout: fallback } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workspacePath });
		return fallback.trim() || getDefaultBranch();
	} catch (error) {
		console.error('Error getting current branch:', error);
		return getDefaultBranch();
	}
}

function getDefaultBranch(): string {
	const config = vscode.workspace.getConfiguration('openInBrowser');
	return config.get<string>('defaultBranch', 'main');
}

function buildUrl(gitInfo: GitRemoteInfo, filePath: string, branch: string, startLine: number, endLine: number): string {
	const providers = getAllProviders();

	// Find matching provider
	const provider = providers.find(p => p.domain === gitInfo.domain);

	if (!provider) {
		throw new Error(`Unsupported Git provider: ${gitInfo.domain}`);
	}

	// Replace placeholders in URL template
	let url = provider.urlTemplate
		.replace('{domain}', gitInfo.domain)
		.replace('{owner}', gitInfo.owner)
		.replace('{repo}', gitInfo.repo)
		.replace('{branch}', branch)
		.replace('{filePath}', filePath);

	// Handle line number placeholders
	if (startLine === endLine) {
		url = url
			.replace('{startLine}', startLine.toString())
			.replace('{endLine}', startLine.toString());
	} else {
		url = url
			.replace('{startLine}', startLine.toString())
			.replace('{endLine}', endLine.toString());
	}

	return url;
}

function getAllProviders(): GitProvider[] {
	const config = vscode.workspace.getConfiguration('openInBrowser');
	const customProviders = config.get<GitProvider[]>('customProviders', []);

	return [...DEFAULT_PROVIDERS, ...customProviders];
}

// This method is called when your extension is deactivated
export function deactivate() {}
