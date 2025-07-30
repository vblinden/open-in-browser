import * as assert from 'assert';

// Test Git URL parsing functionality
suite('Git URL Parsing Tests', () => {

	// Mock of the parseGitRemoteUrl function for testing
	function parseGitRemoteUrl(remoteUrl: string): { domain: string; owner: string; repo: string } | null {
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

				return {
					domain: domain,
					owner: fullPath,
					repo: repo
				};
			}
		}

		return null;
	}

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
});
