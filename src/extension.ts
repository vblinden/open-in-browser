// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GitRemoteInfo {
	domain: string;
	owner: string;
	repo: string;
}

interface GitTemplateValues extends GitRemoteInfo {
	ownerBasename: string;
}

interface GitProvider {
	name: string;
	domain: string;
	urlTemplate: string; // template including line numbers
	urlTemplateNoLines?: string; // optional template without line numbers
	urlTemplateSingleLine?: string; // optional template for a single selected line
}

const DEFAULT_PROVIDERS: GitProvider[] = [
	{
		name: 'GitHub',
		domain: 'github.com',
		urlTemplate: 'https://{domain}/{owner}/{repo}/blob/{branch}/{filePath}#L{startLine}-L{endLine}',
		urlTemplateNoLines: 'https://{domain}/{owner}/{repo}/blob/{branch}/{filePath}',
		urlTemplateSingleLine: 'https://{domain}/{owner}/{repo}/blob/{branch}/{filePath}#L{startLine}'
	},
	{
		name: 'GitLab',
		domain: 'gitlab.com',
		urlTemplate: 'https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}#L{startLine}-{endLine}',
		urlTemplateNoLines: 'https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}',
		urlTemplateSingleLine: 'https://{domain}/{owner}/{repo}/-/blob/{branch}/{filePath}#L{startLine}'
	},
	{
		name: 'Bitbucket',
		domain: 'bitbucket.org',
		urlTemplate: 'https://{domain}/{owner}/{repo}/src/{branch}/{filePath}#lines-{startLine}:{endLine}',
		urlTemplateNoLines: 'https://{domain}/{owner}/{repo}/src/{branch}/{filePath}',
		urlTemplateSingleLine: 'https://{domain}/{owner}/{repo}/src/{branch}/{filePath}#lines-{startLine}'
	},
	{
		name: 'Azure DevOps',
		domain: 'dev.azure.com',
		urlTemplate: 'https://{domain}/{owner}/{repo}?path=/{filePath}&version=GB{branch}&line={startLine}&lineEnd={endLine}&lineStartColumn=1&lineEndColumn=1',
		urlTemplateNoLines: 'https://{domain}/{owner}/{repo}?path=/{filePath}&version=GB{branch}',
		urlTemplateSingleLine: 'https://{domain}/{owner}/{repo}?path=/{filePath}&version=GB{branch}&line={startLine}&lineStartColumn=1'
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

	// Keep the legacy selection command as an alias for compatibility.
	const openSelectionDisposable = vscode.commands.registerCommand('open-in-browser.openSelection', async (uri?: vscode.Uri) => {
		try {
			await openInBrowser(uri);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open selection in browser: ${error}`);
		}
	});

	context.subscriptions.push(openFileDisposable, openSelectionDisposable);
}

async function openInBrowser(uri?: vscode.Uri): Promise<void> {
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

	// Handle git:// URIs from Blame view
	const blameInfo = parseGitBlameUri(fileUri);
	if (blameInfo) {
		const realFileUri = vscode.Uri.file(blameInfo.fsPath);
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(realFileUri);
		if (!workspaceFolder) {
			throw new Error('File is not in a workspace');
		}

		const gitInfo = await getGitInfo(workspaceFolder.uri.fsPath);
		if (!gitInfo) {
			throw new Error('Not a git repository or unable to determine remote URL');
		}

		const relativePath = path.relative(workspaceFolder.uri.fsPath, blameInfo.fsPath);

		let startLine: number | null = null;
		let endLine: number | null = null;
		if (activeEditor && activeEditor.document.uri.toString() === fileUri.toString()) {
			const selectedRange = getSelectedLineRange(activeEditor);
			if (selectedRange) {
				startLine = selectedRange.startLine;
				endLine = selectedRange.endLine;
			}
		}

		const url = buildUrl(gitInfo, relativePath, blameInfo.commitHash, startLine, endLine);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		vscode.window.showInformationMessage(`Opened in browser: ${url}`);
		return;
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

	// Add line numbers only when the active editor has a selection for this file.
	let startLine: number | null = null;
	let endLine: number | null = null;

	if (activeEditor && activeEditor.document.uri.toString() === fileUri.toString()) {
		const selectedRange = getSelectedLineRange(activeEditor);
		if (selectedRange) {
			startLine = selectedRange.startLine;
			endLine = selectedRange.endLine;
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

interface GitBlameUriInfo {
	commitHash: string;
	fsPath: string;
}

export function parseGitBlameUri(uri: vscode.Uri): GitBlameUriInfo | null {
	if (uri.scheme !== 'git') {
		return null;
	}

	try {
		const query = JSON.parse(uri.query) as { path?: string; ref?: string };
		const commitHash = query.ref;
		const fsPath = query.path;

		if (!commitHash || !fsPath) {
			return null;
		}

		return { commitHash, fsPath };
	} catch {
		return null;
	}
}

export function parseGitRemoteUrl(remoteUrl: string): GitRemoteInfo | null {
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

export function getOwnerBasename(owner: string): string {
	const segments = owner.split('/').filter(Boolean);
	return segments.at(-1) ?? owner;
}

export async function getCurrentBranch(workspacePath: string): Promise<string> {
	try {
		let execResult;

		// Try modern `git branch` command
		execResult = await execAsync('git branch --show-current', { cwd: workspacePath });
		const branch = execResult.stdout.trim();

		if (branch) {
			return branch;
		}

		// Fall back to `git rev-parse` if it can return a ref name
		execResult = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workspacePath });
		const branchFallback = execResult.stdout.trim();

		if (branchFallback && branchFallback !== "HEAD") {
			return branchFallback;
		}

		// Otherwise, take the commit hash as-is, if possible
		execResult = await execAsync('git rev-parse --short HEAD', { cwd: workspacePath });
		const commitHash = execResult.stdout.trim();

		return commitHash || getDefaultBranch();
	} catch (error) {
		console.error('Error getting current branch:', error);
		return getDefaultBranch();
	}
}

function getDefaultBranch(): string {
	const config = vscode.workspace.getConfiguration('openInBrowser');
	return config.get<string>('defaultBranch', 'main');
}

export function buildUrl(
	gitInfo: GitRemoteInfo,
	filePath: string,
	branch: string,
	startLine: number | null,
	endLine: number | null
): string {
	const providers = getAllProviders();

	// Find matching provider
	const provider = providers.find(p => p.domain === gitInfo.domain);

	if (!provider) {
		throw new Error(`Unsupported Git provider: ${gitInfo.domain}`);
	}

	const template = getUrlTemplate(provider, startLine, endLine);
	const templateValues: GitTemplateValues = {
		...gitInfo,
		ownerBasename: getOwnerBasename(gitInfo.owner)
	};

	let url = template
		.replace('{domain}', templateValues.domain)
		.replace('{owner}', templateValues.owner)
		.replace('{owner_basename}', templateValues.ownerBasename)
		.replace('{repo}', templateValues.repo)
		.replace('{branch}', branch)
		.replace('{filePath}', filePath);

	if (startLine !== null) {
		url = url.replace('{startLine}', startLine.toString());
	}

	if (endLine !== null) {
		url = url.replace('{endLine}', endLine.toString());
	}

	return cleanupUrl(url, startLine, endLine);
}

function getSelectedLineRange(editor: vscode.TextEditor): { startLine: number; endLine: number } | null {
	const selection = editor.selection;
	if (selection.isEmpty || editor.document.getText(selection).length === 0) {
		return null;
	}

	const startLine = selection.start.line + 1;
	const endLine = selection.end.character === 0 && selection.end.line > selection.start.line
		? selection.end.line
		: selection.end.line + 1;

	return {
		startLine,
		endLine
	};
}

function getUrlTemplate(
	provider: GitProvider,
	startLine: number | null,
	endLine: number | null
): string {
	if (startLine === null || endLine === null) {
		return provider.urlTemplateNoLines ?? provider.urlTemplate;
	}

	if (startLine === endLine) {
		return provider.urlTemplateSingleLine ?? provider.urlTemplate;
	}

	return provider.urlTemplate;
}

function cleanupUrl(url: string, startLine: number | null, endLine: number | null): string {
	if (startLine === null || endLine === null) {
		return url
			.replace(/#L\{startLine\}-L\{endLine\}$/, '')
			.replace(/#L\{startLine\}-\{endLine\}$/, '')
			.replace(/#lines-\{startLine\}:\{endLine\}$/, '')
			.replace(/[?&]line=\{startLine\}(&lineEnd=\{endLine\})?&lineStartColumn=1(&lineEndColumn=1)?/, '')
			.replace(/[?&]lineEnd=\{endLine\}/, '')
			.replace(/[?&]lineStartColumn=1/, '')
			.replace(/[?&]lineEndColumn=1/, '')
			.replace(/[?&]$/, '');
	}

	if (startLine === endLine) {
		return url
			.replace(`#L${startLine}-L${endLine}`, `#L${startLine}`)
			.replace(`#L${startLine}-${endLine}`, `#L${startLine}`)
			.replace(`#lines-${startLine}:${endLine}`, `#lines-${startLine}`)
			.replace(
				`line=${startLine}&lineEnd=${endLine}&lineStartColumn=1&lineEndColumn=1`,
				`line=${startLine}&lineStartColumn=1`
			);
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
