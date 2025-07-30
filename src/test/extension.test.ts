import * as assert from 'assert';
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('vblinden.open-in-browser'));
	});

	test('Extension should activate', async () => {
		const extension = vscode.extensions.getExtension('vblinden.open-in-browser');
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
});
