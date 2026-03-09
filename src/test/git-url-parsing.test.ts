import * as assert from 'assert';
import * as vscode from 'vscode';
import { buildUrl, getOwnerBasename, parseGitRemoteUrl } from '../extension';

// Test Git URL parsing functionality
suite('Git URL Parsing Tests', () => {
	test('Parse HTTPS GitHub URL', () => {
		const result = parseGitRemoteUrl('https://github.com/microsoft/vscode.git');
		assert.ok(result);
		assert.strictEqual(result.domain, 'github.com');
		assert.strictEqual(result.owner, 'microsoft');
		assert.strictEqual(result.repo, 'vscode');
	});

	test('Parse HTTPS URL without .git', () => {
		const result = parseGitRemoteUrl('https://github.com/microsoft/vscode');
		assert.ok(result);
		assert.strictEqual(result.domain, 'github.com');
		assert.strictEqual(result.owner, 'microsoft');
		assert.strictEqual(result.repo, 'vscode');
	});

	test('Parse SSH GitHub URL', () => {
		const result = parseGitRemoteUrl('git@github.com:microsoft/vscode.git');
		assert.ok(result);
		assert.strictEqual(result.domain, 'github.com');
		assert.strictEqual(result.owner, 'microsoft');
		assert.strictEqual(result.repo, 'vscode');
	});

	test('Parse SSH URL with protocol', () => {
		const result = parseGitRemoteUrl('ssh://git@github.com/microsoft/vscode.git');
		assert.ok(result);
		assert.strictEqual(result.domain, 'github.com');
		assert.strictEqual(result.owner, 'microsoft');
		assert.strictEqual(result.repo, 'vscode');
	});

	test('Parse GitLab URL', () => {
		const result = parseGitRemoteUrl('https://gitlab.com/gitlab-org/gitlab.git');
		assert.ok(result);
		assert.strictEqual(result.domain, 'gitlab.com');
		assert.strictEqual(result.owner, 'gitlab-org');
		assert.strictEqual(result.repo, 'gitlab');
	});

	test('Parse private GitLab URL', () => {
		const result = parseGitRemoteUrl('https://gitlab.example.com/myorg/myrepo.git');
		assert.ok(result);
		assert.strictEqual(result.domain, 'gitlab.example.com');
		assert.strictEqual(result.owner, 'myorg');
		assert.strictEqual(result.repo, 'myrepo');
	});

	test('Parse GitLab group/subgroup URL (SSH)', () => {
		const result = parseGitRemoteUrl('git@gitlab.private.instance.com:group/project/repository.git');
		assert.ok(result);
		assert.strictEqual(result.domain, 'gitlab.private.instance.com');
		assert.strictEqual(result.owner, 'group/project');
		assert.strictEqual(result.repo, 'repository');
	});

	test('Parse GitLab group/subgroup URL (HTTPS)', () => {
		const result = parseGitRemoteUrl('https://gitlab.private.instance.com/group/project/repository.git');
		assert.ok(result);
		assert.strictEqual(result.domain, 'gitlab.private.instance.com');
		assert.strictEqual(result.owner, 'group/project');
		assert.strictEqual(result.repo, 'repository');
	});

	test('Invalid URL returns null', () => {
		const result = parseGitRemoteUrl('not-a-valid-url');
		assert.strictEqual(result, null);
	});

	test('Owner basename returns owner when there is no slash', () => {
		assert.strictEqual(getOwnerBasename('dev'), 'dev');
	});

	test('Owner basename uses the last non-empty segment', () => {
		assert.strictEqual(getOwnerBasename('scm/dev/'), 'dev');
		assert.strictEqual(getOwnerBasename('/nested/team/platform'), 'platform');
	});

	test('Custom provider templates can use owner_basename', () => {
		const inspectConfiguration = Object.getOwnPropertyDescriptor(vscode.workspace, 'getConfiguration');
		const originalGetConfiguration = vscode.workspace.getConfiguration;

		Object.defineProperty(vscode.workspace, 'getConfiguration', {
			configurable: true,
			value: () => ({
				get: <T>(key: string, defaultValue?: T): T => {
					if (key === 'customProviders') {
						return [
							{
								name: 'Bitbucket Server',
								domain: 'bitbucket.company.com',
								urlTemplate: 'https://{domain}/projects/{owner_basename}/repos/{repo}/browse/{filePath}?at={branch}#L{startLine}-{endLine}',
								urlTemplateNoLines: 'https://{domain}/projects/{owner_basename}/repos/{repo}/browse/{filePath}?at={branch}',
								urlTemplateSingleLine: 'https://{domain}/projects/{owner_basename}/repos/{repo}/browse/{filePath}?at={branch}#L{startLine}'
							}
						] as T;
					}

					return defaultValue as T;
				}
			})
		});

		try {
			const url = buildUrl(
				{
					domain: 'bitbucket.company.com',
					owner: 'scm/dev',
					repo: 'example-repo'
				},
				'path/script.php',
				'master',
				196,
				235
			);

			assert.strictEqual(
				url,
				'https://bitbucket.company.com/projects/dev/repos/example-repo/browse/path/script.php?at=master#L196-235'
			);
		} finally {
			if (inspectConfiguration) {
				Object.defineProperty(vscode.workspace, 'getConfiguration', inspectConfiguration);
			} else {
				Object.defineProperty(vscode.workspace, 'getConfiguration', {
					configurable: true,
					value: originalGetConfiguration
				});
			}
		}
	});
});
