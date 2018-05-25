import * as vscode from 'vscode';

const previewUri = vscode.Uri.parse('css-preview://authority/css-preview');

export async function readAllFileComments() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return ''; }

    const path = editor.document.uri.path.replace('/tmp/', '');

	return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two, `Comments on ${path}`).then((success) => {
    }, (reason) => {
        vscode.window.showErrorMessage(reason);
    });
}