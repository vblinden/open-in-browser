import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { getCurrentBranch } from '../extension';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('vblinden.git-open-file-in-browser'));
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('vblinden.git-open-file-in-browser');
		if (extension) {
			await extension.activate();
			assert.ok(extension.isActive);
		}
	});

	test('Commands should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('open-in-browser.openFile'));
		assert.ok(commands.includes('open-in-browser.openSelection'));
	});

	test('getCurrentBranch returns branch name when HEAD is attached', async () => {
		const repoPath = createTestRepo();
		const branch = await getCurrentBranch(repoPath);

		assert.strictEqual(branch, 'main');
	});

	test('getCurrentBranch returns short commit hash when HEAD is detached', async () => {
		const repoPath = createTestRepo();
		const expectedHash = execSync('git rev-parse --short HEAD', { cwd: repoPath, encoding: 'utf8' }).trim();

		execSync('git checkout --detach', { cwd: repoPath, stdio: 'ignore' });

		const branch = await getCurrentBranch(repoPath);
		assert.strictEqual(branch, expectedHash);
	});
});

function createTestRepo(): string {
	const repoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'open-in-browser-'));

	execSync('git init -b main', { cwd: repoPath, stdio: 'ignore' });
	execSync('git config user.name "Codex Test"', { cwd: repoPath, stdio: 'ignore' });
	execSync('git config user.email "codex@example.com"', { cwd: repoPath, stdio: 'ignore' });

	fs.writeFileSync(path.join(repoPath, 'README.md'), 'test\n');

	execSync('git add README.md', { cwd: repoPath, stdio: 'ignore' });
	execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'ignore' });

	return repoPath;
}
